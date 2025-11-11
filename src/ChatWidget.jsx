import React, { useState, useRef, useEffect } from "react";
import { Send, X, Volume2, StopCircle, Mic, MessageSquare, FileText } from "lucide-react";

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
  const [feedback, setFeedback] = useState("Please share your feedback about our services and how we can improve your experience.");
  const messagesEndRef = useRef(null);

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

      // 🎤 Speak reply automatically (female voice)
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

  // --- Voice input handler ---
  const handleVoiceInput = () => {
    if (!SpeechRecognition) {
      alert("❌ Sorry, your browser doesn’t support voice recognition.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.lang = "en-US";
    recognition.interimResults = false;

    recognition.start();
    setIsListening(true);

    setMessages((prev) => [
      ...prev,
      {
        id: Date.now(),
        type: "assistant",
        content: "🎙️ Listening... Please speak your question.",
      },
    ]);

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setMessages((prev) => [
        ...prev,
        { id: Date.now(), type: "user", content: transcript },
      ]);
      handleSend(transcript);
      setIsListening(false);
    };

    recognition.onerror = (event) => {
      console.error("Voice recognition error:", event.error);
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now(),
          type: "assistant",
          content: "⚠️ Voice input failed. Please try again.",
        },
      ]);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };
  };

  // --- Generate summary ---
  const generateSummary = async () => {
    const conversation = messages.map((m) => `${m.type}: ${m.content}`).join("\n");
    try {
      const response = await fetch("http://localhost:5000/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversation }),
      });

      const data = await response.json();
      setSummary(data.summary || "⚠️ Could not generate summary.");
    } catch (error) {
      console.error("Summary Error:", error);
      setSummary("❌ Failed to generate summary. Please check your backend.");
    }
  };

  useEffect(() => {
    if (activeTab === "summary") {
      generateSummary();
    }
  }, [activeTab]);

  return (
    <>
      {/* Floating Chat Button */}
      <style>
        {`
          @keyframes pulseGlow {
            0% {
              box-shadow: 0 0 0 0 rgba(37, 99, 235, 0.7);
            }
            70% {
              box-shadow: 0 0 20px 20px rgba(37, 99, 235, 0);
            }
            100% {
              box-shadow: 0 0 0 0 rgba(37, 99, 235, 0);
            }
          }
          .animate-pulse-glow {
            animation: pulseGlow 2s infinite;
          }
        `}
      </style>

      {!isOpen && (
        <div 
          style={{
            position: 'fixed',
            bottom: '32px',
            right: '32px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            zIndex: 9999
          }}
        >
          {/* Tooltip Message */}
          <div style={{
            position: 'relative',
            marginBottom: '12px',
            backgroundColor: 'white',
            color: '#334155',
            padding: '8px 16px',
            borderRadius: '12px',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)',
            border: '1px solid #e2e8f0',
            fontSize: '14px',
            fontWeight: '500',
            animation: 'fadeIn 0.5s ease-out'
          }}>
            👋 Hi, I'm Aria,
            <br />
            Click to chat with me!
            {/* Little arrow below the bubble */}
            <div style={{
              position: 'absolute',
              left: '50%',
              transform: 'translateX(-50%)',
              bottom: '-6px',
              width: '12px',
              height: '12px',
              backgroundColor: 'white',
              borderRight: '1px solid #e2e8f0',
              borderBottom: '1px solid #e2e8f0',
              transform: 'translateX(-50%) rotate(45deg)'
            }}></div>
          </div>

          {/* Floating Chat Button */}
          <button
            onClick={() => setIsOpen(true)}
            style={{
              width: '96px',
              height: '96px',
              borderRadius: '50%',
              backgroundColor: '#1e3a8a',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
              border: '4px solid white',
              cursor: 'pointer',
              transition: 'transform 0.3s ease',
              animation: 'pulseGlow 2s infinite'
            }}
            onMouseEnter={(e) => e.target.style.transform = 'scale(1.1)'}
            onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
          >
            <img
              src="/avatar.png"
              alt="Assistant Avatar"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                borderRadius: '50%'
              }}
            />
          </button>
        </div>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div 
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            width: '384px',
            height: '600px',
            backgroundColor: 'white',
            borderRadius: '16px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            border: '1px solid #e2e8f0',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            zIndex: 9999,
            animation: 'slideUp 0.3s ease-out'
          }}
        >
          {/* Header */}
          <div style={{
            background: 'linear-gradient(90deg, #2563eb, #9333ea)',
            color: 'white',
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              <img
                src="/avatar.png"
                alt="Assistant"
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  border: '2px solid white'
                }}
              />
              <div>
                <div style={{ fontWeight: '600' }}>Aria AI</div>
                <div style={{
                  fontSize: '12px',
                  color: '#ddd6fe',
                  marginTop: '-2px'
                }}>
                  Company Assistant
                </div>
              </div>
            </div>

            <button
              onClick={() => setIsOpen(false)}
              style={{
                padding: '4px',
                borderRadius: '4px',
                border: 'none',
                background: 'transparent',
                color: 'white',
                cursor: 'pointer',
                transition: 'background-color 0.2s'
              }}
              onMouseEnter={(e) => e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.2)'}
              onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
            >
              <X style={{ width: '16px', height: '16px' }} />
            </button>
          </div>

          {/* Chat Area */}
          <div style={{
            flex: 1,
            overflowY: 'auto',
            padding: '16px',
            backgroundColor: '#f8fafc'
          }}>
            {(activeTab === "chat" || activeTab === "voice") && (
              <>
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    style={{
                      marginBottom: '12px',
                      textAlign: msg.type === "user" ? "right" : "left"
                    }}
                  >
                    <div
                      style={{
                        display: 'inline-block',
                        padding: '8px 12px',
                        borderRadius: '16px',
                        backgroundColor: msg.type === "assistant" ? 'white' : '#2563eb',
                        border: msg.type === "assistant" ? '1px solid #e2e8f0' : 'none',
                        color: msg.type === "assistant" ? '#1e293b' : 'white',
                        maxWidth: '85%',
                        wordWrap: 'break-word'
                      }}
                    >
                      {msg.content}
                    </div>
                    {msg.type === "assistant" && (
                      <button
                        onClick={() => handleTextToSpeech(msg.content)}
                        style={{
                          marginLeft: '8px',
                          display: 'inline-block',
                          color: '#94a3b8',
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          transition: 'color 0.2s'
                        }}
                        title="Read aloud"
                        onMouseEnter={(e) => e.target.style.color = '#2563eb'}
                        onMouseLeave={(e) => e.target.style.color = '#94a3b8'}
                      >
                        {isSpeaking ? <StopCircle size={14} /> : <Volume2 size={14} />}
                      </button>
                    )}
                  </div>
                ))}

                {isTyping && (
                  <div style={{
                    color: '#64748b',
                    fontSize: '14px',
                    fontStyle: 'italic'
                  }}>Typing...</div>
                )}

                {isListening && (
                  <div style={{
                    fontSize: '14px',
                    color: '#2563eb',
                    fontStyle: 'italic',
                    marginTop: '8px'
                  }}>
                    🎧 Listening...
                  </div>
                )}

                {/* ✅ Suggested Questions */}
                {showSuggestions && messages.length <= 2 && (
                  <div style={{ marginTop: '12px' }}>
                    <p style={{
                      fontSize: '14px',
                      color: '#64748b',
                      marginBottom: '8px'
                    }}>
                      Suggested questions:
                    </p>
                    <div style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: '8px'
                    }}>
                      {[
                        "What services does Tekisho offer?",
                      ].map((q, index) => (
                        <button
                          key={index}
                          onClick={() => handleSuggestedQuestion(q)}
                          style={{
                            padding: '8px 12px',
                            backgroundColor: '#f1f5f9',
                            color: '#374151',
                            fontSize: '14px',
                            borderRadius: '8px',
                            border: '1px solid #e2e8f0',
                            cursor: 'pointer',
                            transition: 'background-color 0.2s'
                          }}
                          onMouseEnter={(e) => e.target.style.backgroundColor = '#dbeafe'}
                          onMouseLeave={(e) => e.target.style.backgroundColor = '#f1f5f9'}
                        >
                          {q}
                        </button>
                      ))}
                      <button
                        onClick={() => setShowSuggestions(false)}
                        style={{
                          padding: '8px 12px',
                          backgroundColor: '#2563eb',
                          color: 'white',
                          fontSize: '14px',
                          borderRadius: '8px',
                          border: '1px solid #1d4ed8',
                          cursor: 'pointer',
                          transition: 'background-color 0.2s'
                        }}
                        onMouseEnter={(e) => e.target.style.backgroundColor = '#1d4ed8'}
                        onMouseLeave={(e) => e.target.style.backgroundColor = '#2563eb'}
                      >
                        Other
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Feedback Tab */}
            {activeTab === "feedback" && (
              <div style={{
                fontSize: '14px',
                color: '#374151',
                whiteSpace: 'pre-wrap'
              }}>
                <h3 style={{
                  fontWeight: '600',
                  marginBottom: '8px',
                  color: '#1d4ed8'
                }}>
                  💬 Share Your Feedback:
                </h3>
                {feedback}
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Area (only for Chat tab) */}
          {activeTab === "chat" && !showSuggestions && (
            <div style={{
              borderTop: '1px solid #e2e8f0',
              padding: '12px',
              display: 'flex',
              gap: '8px'
            }}>
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
                  border: '1px solid #d1d5db',
                  borderRadius: '12px',
                  padding: '8px 12px',
                  fontSize: '14px',
                  resize: 'none',
                  outline: 'none',
                  fontFamily: 'inherit'
                }}
              />
              <button
                onClick={() => handleSend()}
                disabled={!input.trim()}
                style={{
                  backgroundColor: input.trim() ? '#2563eb' : '#d1d5db',
                  borderRadius: '50%',
                  padding: '8px',
                  border: 'none',
                  cursor: input.trim() ? 'pointer' : 'not-allowed',
                  transition: 'background-color 0.2s'
                }}
                onMouseEnter={(e) => {
                  if (input.trim()) e.target.style.backgroundColor = '#1d4ed8';
                }}
                onMouseLeave={(e) => {
                  if (input.trim()) e.target.style.backgroundColor = '#2563eb';
                }}
              >
                <Send style={{ width: '16px', height: '16px', color: 'white' }} />
              </button>
            </div>
          )}

          {/* Bottom Tabs */}
          <div style={{
            borderTop: '1px solid #e2e8f0',
            backgroundColor: 'white',
            display: 'flex',
            justifyContent: 'space-around',
            padding: '8px 0',
            color: '#64748b',
            fontSize: '14px'
          }}>
            <button
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: activeTab === "chat" ? "#2563eb" : "#64748b",
                transition: 'color 0.2s'
              }}
              onClick={() => setActiveTab("chat")}
            >
              <MessageSquare size={18} />
              Chat
            </button>
            <button
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: activeTab === "voice" ? "#2563eb" : "#64748b",
                transition: 'color 0.2s'
              }}
              onClick={() => {
                setActiveTab("voice");
                handleVoiceInput();
              }}>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="26"
                height="26"
                viewBox="0 0 64 64"
              >
                {/* Chatbot head */}
                <rect
                  x="10"
                  y="22"
                  width="44"
                  height="30"
                  rx="8"
                  ry="8"
                  stroke="#1e3a8a"
                  strokeWidth="3"
                  fill="none"
                />
                {/* Eyes */}
                <circle cx="24" cy="37" r="3" fill="#1e3a8a" />
                <circle cx="40" cy="37" r="3" fill="#1e3a8a" />
                {/* Smile */}
                <path
                  d="M24 45c4 3 12 3 16 0"
                  stroke="#1e3a8a"
                  strokeWidth="3"
                  fill="none"
                  strokeLinecap="round"
                />
                {/* Antenna */}
                <line x1="32" y1="18" x2="32" y2="10" stroke="#1e3a8a" strokeWidth="3" />
                <circle cx="32" cy="7" r="2.5" fill="#3b82f6" />
                {/* Speech bubble */}
                <path
                  d="M45 10h10a4 4 0 0 1 4 4v6a4 4 0 0 1-4 4h-3l-4 4v-4h-3a4 4 0 0 1-4-4v-6a4 4 0 0 1 4-4z"
                  stroke="#3b82f6"
                  strokeWidth="2"
                  fill="none"
                />
                {/* 🎤 Mic inside the speech bubble */}
                <path
                  d="M52 13v4a2 2 0 0 1-4 0v-4a2 2 0 0 1 4 0z"
                  fill="#3b82f6"
                />
                <path
                  d="M48 18a3 3 0 0 0 6 0"
                  stroke="#3b82f6"
                  strokeWidth="1.5"
                  fill="none"
                  strokeLinecap="round"
                />
                <line x1="51" y1="21" x2="51" y2="22" stroke="#3b82f6" strokeWidth="1.5" />
              </svg>

              Voice
            </button>
            <button
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: activeTab === "feedback" ? "#2563eb" : "#64748b",
                transition: 'color 0.2s'
              }}
              onClick={() => setActiveTab("feedback")}
            >
              <FileText size={18} />
              Feedback
            </button>
          </div>
        </div>
      )}
    </>
  );
}
