// src/viewmodels/chatViewModel.js
import { useState, useEffect, useRef } from "react";

export function useChatViewModel() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [preferredVoice, setPreferredVoice] = useState(null);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [activeTab, setActiveTab] = useState("chat");
  const [feedback, setFeedback] = useState("");
  const [emotion, setEmotion] = useState("neutral");

  const messagesEndRef = useRef(null);

  const suggestedQuestions = [
    "What services does your company offer?",
    "Can you tell me about AI products?",
    "What are your comany values?",
    "What Industries do you serve?",
    "How can I contact support?",
  ];

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "☀️ Good morning!";
    if (hour < 18) return "🌤️ Good afternoon!";
    return "🌙 Good evening!";
  };

  // Initial welcome message
  useEffect(() => {
    setMessages([
      {
        id: 1,
        type: "assistant",
        content: `${getGreeting()} I'm Veda, your AI company assistant. You can choose a question below or ask anything about your business.`,
      },
    ]);
  }, []);

  // Keep browser voices warm
  useEffect(() => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      const pickPreferred = () => {
        const voices = window.speechSynthesis.getVoices() || [];

        // Preferred female-leaning voice name candidates (ordered)
        const preferredNames = [
          "Samantha",
          "Victoria",
          "Emma",
          "Zira",
          "Alloy",
          "verse",
          "Google UK English Female",
          "Google US English",
        ];

        let found = voices.find(v => preferredNames.includes(v.name));

        if (!found) {
          // fallback: pick first voice whose name or lang suggests en-US/en-GB
          found = voices.find(v => /en-(US|GB)|English/i.test(v.lang || v.name));
        }

        if (found) setPreferredVoice(found);
      };

      window.speechSynthesis.onvoiceschanged = pickPreferred;
      // run once in case voices already loaded
      pickPreferred();
    }
  }, []);

  // Auto scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Stop any speaking on unmount
  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // --- Actions ----

  const handleSend = async (customQuestion = null) => {
    const messageToSend = customQuestion || input;
    if (!messageToSend.trim()) return;

    const userMessage = {
      id: Date.now(),
      type: "user",
      content: messageToSend,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsTyping(true);
    setShowSuggestions(false);

    try {
      const response = await fetch("http://localhost:5000/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: messageToSend, emotion }),
      });

      const data = await response.json();
      const aiReply =
        data.answer ||
        "⚠️ Sorry, I couldn't find that information in the document.";

      const botMessage = {
        id: Date.now(),
        type: "assistant",
        content: aiReply,
        followUps: data.followUps || [],
      };

      setMessages((prev) => [...prev, botMessage]);

      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        const utterance = new SpeechSynthesisUtterance(aiReply);
        utterance.lang = "en-US";
        if (preferredVoice) utterance.voice = preferredVoice;
        window.speechSynthesis.speak(utterance);
      }
    } catch (error) {
      console.error("Chat Error:", error);
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now(),
          type: "assistant",
          content:
            "❌ There was a problem contacting the server. Please check your backend.",
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleTextToSpeech = (text) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    } else {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "en-US";
      if (preferredVoice) utterance.voice = preferredVoice;
      utterance.onend = () => setIsSpeaking(false);
      window.speechSynthesis.speak(utterance);
      setIsSpeaking(true);
    }
  };

  const handleFeedbackSubmit = async () => {
    if (!feedback.trim()) {
      alert("⚠️ Please enter feedback before submitting.");
      return;
    }

    try {
      await fetch("http://localhost:5000/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: feedback }),
      });
      setFeedback("");
      alert("✅ Thank you! Your feedback has been submitted.");
    } catch (err) {
      alert("❌ Could not send feedback. Check your backend.");
    }
  };

  return {
    // state
    isOpen,
    setIsOpen,
    messages,
    input,
    setInput,
    isTyping,
    isSpeaking,
    showSuggestions,
    setShowSuggestions,
    activeTab,
    setActiveTab,
    feedback,
    setFeedback,
    emotion,
    setEmotion,
    suggestedQuestions,
    messagesEndRef,

    // actions
    handleSend,
    handleTextToSpeech,
    preferredVoice,
    setPreferredVoice,
    handleFeedbackSubmit,
  };
}
