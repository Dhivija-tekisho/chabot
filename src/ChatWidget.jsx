import React, { useState, useRef, useEffect } from "react";
import { Send, X, Volume2, StopCircle, MessageSquare, FileText, Mic, MicOff } from "lucide-react";


const SpeechRecognition =
  window.SpeechRecognition || window.webkitSpeechRecognition;

export default function ChatWidget() {
  const [isListening, setIsListening] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [activeTab, setActiveTab] = useState("chat"); // "chat", "voice", "feedback"
  const [feedback, setFeedback] = useState("");
  const messagesEndRef = useRef(null);
  const [isLiveMode, setIsLiveMode] = useState(false);
  const suggestedQuestions = [
  "What services does your company offer?",
  "How can I contact support?",
  "Can you tell me about pricing?",
  "What are your business hours?",
  "Where are you located?",
];



  // 🕓 Dynamic greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "☀️ Good morning!";
    if (hour < 18) return "🌤️ Good afternoon!";
    return "🌙 Good evening!";
  };

  // Load greeting on mount
  useEffect(() => {
    setMessages([
      {
        id: 1,
        type: "assistant",
        content: `${getGreeting()} I'm Aria, your AI company assistant. You can choose a question below or ask anything about your business.`,
      },
    ]);
  }, []);

  // Ensure voices are loaded before we pick one
  useEffect(() => {
    window.speechSynthesis.onvoiceschanged = () => {
      window.speechSynthesis.getVoices();
    };
  }, []);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // 🧹 Cleanup: Stop mic & speech on unmount
useEffect(() => {
  return () => {
    window.speechSynthesis.cancel();
    setIsLiveMode(false);
    setIsListening(false);
  };
}, []);


  // --- Send message handler ---
  const handleSend = async (customQuestion = null) => {
    const messageToSend = customQuestion || input;
    if (!messageToSend.trim()) return;

    const userMessage = { id: Date.now(), type: "user", content: messageToSend };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsTyping(true);
    setShowSuggestions(false);

    try {
      const pageText = document.body.innerText.slice(0, 8000);
      const response = await fetch("http://localhost:5000/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: messageToSend,
          context: pageText,
        }),
      });

      const data = await response.json();
      const aiReply =
        data.answer ||
        "⚠️ Sorry, I couldn’t find that information in the document.";

      const botMessage = { id: Date.now(), type: "assistant", content: aiReply };
      setMessages((prev) => [...prev, botMessage]);

      // 🎤 Speak reply automatically
      if ("speechSynthesis" in window) {
        const utterance = new SpeechSynthesisUtterance(aiReply);
        utterance.lang = "en-US";
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        const voices = window.speechSynthesis.getVoices();
        const femaleVoice =
          voices.find((v) =>
            /female|woman|susan|samantha|karen|zoe|emma|victoria/i.test(v.name)
          ) || voices.find((v) => v.lang.startsWith("en"));
        if (femaleVoice) utterance.voice = femaleVoice;
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

  // --- Suggested question handler ---
  const handleSuggestedQuestion = (question) => {
    handleSend(question);
  };

  // --- Text-to-speech ---
  const handleTextToSpeech = (text) => {
    if ("speechSynthesis" in window) {
      if (isSpeaking) {
        window.speechSynthesis.cancel();
        setIsSpeaking(false);
      } else {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = "en-US";
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        const voices = window.speechSynthesis.getVoices();
        const femaleVoice =
          voices.find((v) =>
            /female|woman|susan|samantha|karen|zoe|emma|victoria/i.test(v.name)
          ) || voices.find((v) => v.lang.startsWith("en"));
        if (femaleVoice) utterance.voice = femaleVoice;
        utterance.onend = () => setIsSpeaking(false);
        window.speechSynthesis.speak(utterance);
        setIsSpeaking(true);
      }
    }
  };

  // --- Voice input handler (Continuous Call Mode) ---
const handleVoiceInput = () => {
  if (!SpeechRecognition) {
    alert("❌ Sorry, your browser doesn’t support voice recognition.");
    return;
  }

  // 🎤 If already listening -> stop
  if (isLiveMode) {
    setIsLiveMode(false);
    setIsListening(false);
    window.speechSynthesis.cancel();
    setMessages((prev) => [
      ...prev,
      { id: Date.now(), type: "assistant", content: "🛑 Voice conversation stopped." },
    ]);
    return;
  }

  // Start continuous listening
  const recognition = new SpeechRecognition();
  recognition.continuous = true;
  recognition.lang = "en-US";
  recognition.interimResults = false;

  recognition.start();
  setIsLiveMode(true);
  setIsListening(true);

  setMessages((prev) => [
    ...prev,
    {
      id: Date.now(),
      type: "assistant",
      content: "🎧 Voice mode activated. I'm listening — say something!",
    },
  ]);

  recognition.onresult = async (event) => {
    const transcript = event.results[event.results.length - 1][0].transcript.trim();
    console.log("🎙️ Heard:", transcript);

    // 🛑 If user says "stop" — end call
    if (/stop|thank you|goodbye/i.test(transcript)) {
      recognition.stop();
      setIsLiveMode(false);
      setIsListening(false);
      setMessages((prev) => [
        ...prev,
        { id: Date.now(), type: "user", content: transcript },
        {
          id: Date.now() + 1,
          type: "assistant",
          content: "👋 Stopping voice conversation. Talk to you soon!",
        },
      ]);
      return;
    }

    // Otherwise, send query
    setMessages((prev) => [
      ...prev,
      { id: Date.now(), type: "user", content: transcript },
    ]);

    try {
      const response = await fetch("http://localhost:5000/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: transcript }),
      });

      const data = await response.json();
      const aiReply =
        data.answer ||
        "⚠️ Sorry, I couldn’t find that information in the document.";

      const botMessage = { id: Date.now(), type: "assistant", content: aiReply };
      setMessages((prev) => [...prev, botMessage]);

      // 🔊 Speak reply
      if ("speechSynthesis" in window) {
        const utterance = new SpeechSynthesisUtterance(aiReply);
        utterance.lang = "en-US";
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        const voices = window.speechSynthesis.getVoices();
        const femaleVoice =
          voices.find((v) =>
            /female|woman|susan|samantha|karen|zoe|emma|victoria/i.test(v.name)
          ) || voices.find((v) => v.lang.startsWith("en"));
        if (femaleVoice) utterance.voice = femaleVoice;
        window.speechSynthesis.speak(utterance);
      }
    } catch (err) {
      console.error("Voice chat error:", err);
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now(),
          type: "assistant",
          content: "⚠️ Error during voice response.",
        },
      ]);
    }
  };

  recognition.onerror = (event) => {
    console.error("Voice recognition error:", event.error);
    setIsListening(false);
    if (isLiveMode) {
      recognition.start(); // auto-restart on error
    }
  };

  recognition.onend = () => {
  if (isLiveMode) {
    setTimeout(() => recognition.start(), 500); // short delay prevents crash loops
  } else {
    setIsListening(false);
  }
};

};
  // --- Feedback submission handler ---
  const handleFeedbackSubmit = async () => {
    if (!feedback.trim()) {
      alert("⚠️ Please enter feedback before submitting.");
      return;
    }

    try {
      const response = await fetch("http://localhost:5000/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: feedback }),
      });
      const data = await response.json();

      if (data.success) {
        setFeedback("");
        alert("✅ Thank you! Your feedback has been submitted.");
      } else {
        alert("⚠️ Failed to send feedback. Please try again later.");
      }
    } catch (err) {
      console.error("Feedback submission error:", err);
      alert("❌ Could not send feedback. Check your backend connection.");
    }
  };

  return (
    <>
      {/* Floating Chat Button */}
      {!isOpen && (
        <div
          style={{
            position: "fixed",
            bottom: "32px",
            right: "32px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            zIndex: 9999,
          }}
        >
          <div
            style={{
              position: "relative",
              marginBottom: "12px",
              backgroundColor: "white",
              color: "#334155",
              padding: "8px 16px",
              borderRadius: "12px",
              boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1)",
              border: "1px solid #e2e8f0",
              fontSize: "14px",
              fontWeight: "500",
            }}
          >
            👋 Hi, I'm Aria,
            <br />
            Click to chat with me!
            <div
              style={{
                position: "absolute",
                left: "50%",
                bottom: "-6px",
                width: "12px",
                height: "12px",
                backgroundColor: "white",
                borderRight: "1px solid #e2e8f0",
                borderBottom: "1px solid #e2e8f0",
                transform: "translateX(-50%) rotate(45deg)",
              }}
            ></div>
          </div>
              <button
            onClick={() => setIsOpen(true)}
            style={{
              width: "96px",
              height: "96px",
              borderRadius: "50%",
              backgroundColor: "#1e3a8a",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
              border: "4px solid white",
              cursor: "pointer",
            }}
          >
            <video
              src="/avatar-video.mp4"
              autoPlay
              loop
              muted
              playsInline
              preload="auto"
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                borderRadius: "50%",
                transition: "transform 0.3s ease",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.05)")}
              onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
            />
          </button>

         
        </div>
      )}

      {/* Chat Window */}
      {isOpen && (
          <div
            style={{
              position: "fixed",
              bottom: "34px",
              right: "30px",
              width: "425px",
              height: "580px",
              backgroundColor: "rgb(49, 121, 224)",
              borderRadius: "16px",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
              border: "rgba(51, 173, 234, 0.6)",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
              zIndex: 9999,
            }}
          >

          {/* Header */}
            <div
              style={{
              position: "relative",
              color: "black",
              padding: "14px 18px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              borderTopLeftRadius: "16px",
              borderTopRightRadius: "16px",
              boxShadow: "0 4px 10px rgba(0, 0, 0, 0.2)",
              overflow: "hidden",
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.boxShadow =
                "0 0 20px rgba(147, 51, 234, 0.6)")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.boxShadow =
                "0 4px 10px rgba(0, 0, 0, 0.2)")
            }
          >
            {/* 🔹 Background video */}
            <video
              src="/header-bg.mp4"
              autoPlay
              loop
              muted
              playsInline
              preload="auto"
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
                objectFit: "cover",
                zIndex: 0,
                opacity: 0.4,
                filter: "blur(1px) brightness(0.9)",
                pointerEvents: "none", // ✅ allows clicks to pass through!
              }}
            />

            {/* 🔹 Foreground content */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                width: "100%",
                position: "relative",
                zIndex: 2, // ✅ ensures button and avatar are clickable
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <video
                  src="/avatar-video.mp4"
                  autoPlay
                  loop
                  muted
                  playsInline
                  preload="auto"
                  style={{
                    width: "68px",
                    height: "68px",
                    borderRadius: "50%",
                    border: "2px solid rgba(147, 51, 234, 0.6)",
                    objectFit: "cover",
                    boxShadow: "0 0 10px rgba(255, 255, 255, 0.5)",
                    transition: "transform 0.3s ease, box-shadow 0.3s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "scale(1.08)";
                    e.currentTarget.style.boxShadow =
                      "0 0 20px rgba(255, 255, 255, 0.9)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "scale(1)";
                    e.currentTarget.style.boxShadow =
                      "0 0 10px rgba(255, 255, 255, 0.5)";
                  }}
                />
                <div>
                  <div
                    style={{
                      fontWeight: "700",
                      fontSize: "20px",
                      letterSpacing: "0.3px",
                    }}
                  >
                    Aria AI
                  </div>
                  <div style={{ fontSize: "13px", color: "#475569" }}>
                    Company Assistant
                  </div>
                </div>
              </div>

              {/* ✅ Close button now clickable */}
              <button
                onClick={() => setIsOpen(false)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "blue",
                  cursor: "pointer",
                  transition: "transform 0.2s ease",
                  zIndex: 5, // ✅ ensures it’s above everything
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.transform = "rotate(90deg)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.transform = "rotate(0deg)")
                }
              >
                <X style={{ width: "25px", height: "25px" }} />
              </button>
            </div>
          </div>

          {/* Chat Area */}
          <div
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "16px",
              backgroundColor: "#f8fafc",
            }}
          >
            {(activeTab === "chat" || activeTab === "voice") && (
              <>
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    style={{
                      marginBottom: "12px",
                      textAlign: msg.type === "user" ? "right" : "left",
                    }}
                  >
                    <div
                      style={{
                        display: "inline-block",
                        padding: "8px 12px",
                        borderRadius: "16px",
                        backgroundColor:
                          msg.type === "assistant" ? "white" : "#2546ebff",
                        border:
                          msg.type === "assistant"
                            ? "1px solid #259feb7c"
                            : "none",
                        color:
                          msg.type === "assistant" ? "#1e293b" : "white",
                        maxWidth: "85%",
                        wordWrap: "break-word",
                      }}
                    >
                      {msg.content}
                    </div>
                    {msg.type === "assistant" && (
                      <button
                        onClick={() => handleTextToSpeech(msg.content)}
                        style={{
                          marginLeft: "8px",
                          background: "none",
                          border: "none",
                          color: "#25b0eb",
                          cursor: "pointer",
                        }}
                      >
                        {isSpeaking ? <StopCircle size={14} /> : <Volume2 size={14} />}
                      </button>
                    )}
                  </div>
                ))}

                {isTyping && (
                  <div style={{ color: "#64748b", fontSize: "14px" }}>Typing...</div>
                )}
                {isListening && (
                  <div style={{ color: "#2563eb", fontSize: "14px" }}>🎧 Listening...</div>
                )}
              </>
            )}
            {showSuggestions && activeTab === "chat" && (
  <div
    style={{
      display: "flex",
      flexWrap: "wrap",
      gap: "10px",
      marginTop: "16px",
      justifyContent: "flex-start",
    }}
  >
    {suggestedQuestions.map((q, index) => (
      <button
        key={index}
        onClick={() => handleSend(q)}
        style={{
          padding: "10px 16px",
          borderRadius: "12px",
          border: "1px solid rgba(255,255,255,0.2)",
          background:
            "linear-gradient(145deg, rgba(255,255,255,0.1), rgba(0,0,0,0.05))",
          boxShadow:
            "0 2px 4px rgba(0,0,0,0.1), inset 0 1px 1px rgba(255,255,255,0.2)",
          color: "#1e598aff",
          fontSize: "14px",
          fontWeight: 500,
          letterSpacing: "0.3px",
          cursor: "pointer",
          transition: "all 0.25s ease",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background =
            "linear-gradient(145deg, #e0e7ff, #c7d2fe)";
          e.currentTarget.style.transform = "translateY(-2px)";
          e.currentTarget.style.boxShadow =
            "0 4px 10px rgba(59, 131, 246, 0.01)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background =
            "linear-gradient(145deg, rgba(255,255,255,0.1), rgba(0,0,0,0.05))";
          e.currentTarget.style.transform = "translateY(0)";
          e.currentTarget.style.boxShadow =
            "0 2px 4px rgba(0,0,0,0.1), inset 0 1px 1px rgba(255,255,255,0.2)";
        }}
      >
        {q}
      </button>
    ))}
  </div>
)}



            {/* Feedback Tab */}
            {activeTab === "feedback" && (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  padding: "16px",
                  gap: "12px",
                }}
              >
                <h3 style={{ fontWeight: "600", color: "#1d4ed8" }}>
                  💬 Share Your Feedback
                </h3>

                <textarea
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="Please share your thoughts..."
                  rows={5}
                  style={{
                    border: "1px solid #d1d5db",
                    borderRadius: "12px",
                    padding: "12px",
                    fontSize: "14px",
                    resize: "none",
                    outline: "none",
                  }}
                />

                <button
                  onClick={handleFeedbackSubmit}
                  style={{
                    backgroundColor: "#2563eb",
                    color: "white",
                    border: "none",
                    borderRadius: "8px",
                    padding: "10px 16px",
                    cursor: "pointer",
                  }}
                >
                  Submit Feedback
                </button>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Area (Chat only) */}
          {activeTab === "chat" && !showSuggestions && (
            <div
              style={{
                borderTop: "1px solid #e2e8f0",
                padding: "12px",
                display: "flex",
                gap: "8px",
              }}
            >
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="Type your question..."
                rows={1}
                style={{
                  flex: 1,
                  border: "1px solid #d1d5db",
                  borderRadius: "12px",
                  padding: "8px 12px",
                  fontSize: "14px",
                  resize: "none",
                }}
              />
              <button
                onClick={() => handleSend()}
                disabled={!input.trim()}
                style={{
                  backgroundColor: input.trim() ? "#2563eb" : "#d1d5db",
                  borderRadius: "50%",
                  padding: "8px",
                  border: "none",
                  cursor: input.trim() ? "pointer" : "not-allowed",
                }}
              >
                <Send style={{ width: "16px", height: "16px", color: "white" }} />
              </button>
            </div>
          )}

          {/* Bottom Tabs */}
          <div
            style={{
              borderTop: "1px solid #e2e8f0",
              backgroundColor: "white",
              display: "flex",
              justifyContent: "space-around",
              padding: "8px 0",
              color: "#64748b",
              fontSize: "14px",
            }}
          >
              <button
  style={{
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    background: "none",
    border: "none",
    cursor: "pointer",
    color: activeTab === "chat" ? "#2563eb" : "#64748b",
  }}
  onClick={() => {
    setActiveTab("chat");
    setShowSuggestions(false); // 👈 Force text box to show
  }}
>
  <MessageSquare size={22} />
  Chat
</button>

              <button
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                background: "none",
                border: "none",
                cursor: "pointer",
                color: isLiveMode ? "#ef4444" : activeTab === "voice" ? "#2563eb" : "#64748b",
                transition: "color 0.3s ease",
                animation: isLiveMode ? "pulse 1.2s infinite" : "none",
              }}
              onClick={() => {
                setActiveTab("voice");
                handleVoiceInput();
              }}
            >
              {isLiveMode ? <MicOff size={26} /> : <Mic size={26} />}
              <span style={{ fontSize: "12px", marginTop: "4px" }}>
                {isLiveMode ? "Stop" : "Voice"}
              </span>
            </button>



            <button
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                background: "none",
                border: "none",
                cursor: "pointer",
                color: activeTab === "feedback" ? "#2563eb" : "#64748b",
              }}
              onClick={() => setActiveTab("feedback")}
            >
              <FileText size={22} />
              Feedback
            </button>
          </div>
        </div>
      )}
    </>
  );
}
