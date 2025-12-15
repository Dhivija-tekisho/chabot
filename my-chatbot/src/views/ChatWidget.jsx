// src/views/ChatWidget.jsx
import React, { useState } from "react";
import { X, MessageSquare, PhoneCall, Compass } from "lucide-react";

import ChatTab from "./ChatTab";
import ExplorerTab from "./ExplorerTab";  // correct location ✔️
import LiveCallTab from "./LiveCallTab";
import { useChatViewModel } from "../viewmodels/chatViewModel";

export default function ChatWidget() {
  const {
    isOpen,
    setIsOpen,
    messages,
    input,
    setInput,
    isTyping,
    isSpeaking,
    showSuggestions,
    activeTab,
    setActiveTab,
    feedback,
    setFeedback,
    emotion,
    suggestedQuestions,
    messagesEndRef,
    handleSend,
    handleTextToSpeech,
    handleFeedbackSubmit,
  } = useChatViewModel();

  // Show popup after closing
  const [showFeedbackPopup, setShowFeedbackPopup] = useState(false);

  // When user clicks X in the header
  const handleClose = () => {
    setIsOpen(false);
    setShowFeedbackPopup(true);
  };

  return (
    <>
      {/* FEEDBACK POPUP AFTER CLOSING */}
      {showFeedbackPopup && (
        <div
          style={{
            position: "fixed",
            bottom: "40px",
            right: "40px",
            width: "260px",
            padding: "16px",
            background: "white",
            borderRadius: "12px",
            boxShadow: "0 10px 25px rgba(0,0,0,0.15)",
            zIndex: 9999,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <h4 style={{ margin: 0, fontWeight: "600" }}>Your feedback</h4>

            {/* Close popup button */}
            <button
              onClick={() => setShowFeedbackPopup(false)}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
              }}
            >
              <X size={18} />
            </button>
          </div>

          <textarea
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="Write here..."
            rows={3}
            style={{
              width: "100%",
              marginTop: "10px",
              padding: "8px",
              borderRadius: "8px",
              border: "1px solid #d1d5db",
              resize: "none",
            }}
          />

          <button
            onClick={() => {
              handleFeedbackSubmit();
              setShowFeedbackPopup(false); // Close popup after submitting
            }}
            style={{
              marginTop: "12px",
              width: "100%",
              background: "#2563eb",
              color: "white",
              padding: "10px",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
            }}
          >
            Send
          </button>
        </div>
      )}

      {/* FLOATING CHAT BUTTON */}
      {!isOpen && !showFeedbackPopup && (
        <div
          style={{
            position: "fixed",
            bottom: "32px",
            right: "32px",
            zIndex: 9999,
          }}
        >
          <button
            onClick={() => setIsOpen(true)}
            style={{
              width: "96px",
              height: "96px",
              borderRadius: "50%",
              backgroundColor: "#1e3a8a",
              border: "4px solid white",
              cursor: "pointer",
              overflow: "hidden",
              boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)",
            }}
          >
            <video
              src="/avatar-video.mp4"
              autoPlay
              loop
              muted
              playsInline
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
              }}
            />
          </button>
        </div>
      )}

      {/* MAIN CHAT WIDGET */}
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
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            zIndex: 9999,
          }}
        >
          {/* HEADER */}
          <div
            style={{
              position: "relative",
              padding: "14px 18px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              boxShadow: "0 4px 10px rgba(0,0,0,0.2)",
              overflow: "hidden",   // <-- ADD THIS
            }}
          >

              {/* BACKGROUND VIDEO (RESTORED) */}
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
                pointerEvents: "none",
              }}
            />

            <div style={{ display: "flex", alignItems: "center", gap: "12px", position: "relative", zIndex: 2 }}>
              <video
                src="/avatar-video.mp4"
                autoPlay
                loop
                muted
                playsInline
                style={{
                  width: "65px",
                  height: "65px",
                  borderRadius: "50%",
                  border: "2px solid rgba(147, 51, 234, 0.6)",
                  objectFit: "cover",
                }}
              />
              <div>
                <div style={{ fontSize: "20px", fontWeight: "700" }}>Veda AI</div>
                <div style={{ fontSize: "13px", color: "#475569" }}>
                  Company Assistant
                </div>
              </div>
            </div>

            {/* X → Close widget + show popup */}
            <button
              onClick={handleClose}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                position: "relative",
                zIndex: 2,   // <-- ADD THIS
              }}
            >

              <X size={25} color="blue" />
            </button>
          </div>

          {/* BODY */}
          <div
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "16px",
              background: "#f8fafc",
            }}
          >
            {activeTab === "chat" && (
              <ChatTab
                messages={messages}
                isTyping={isTyping}
                showSuggestions={showSuggestions}
                suggestedQuestions={suggestedQuestions}
                input={input}
                setInput={setInput}
                onSend={handleSend}
                handleTextToSpeech={handleTextToSpeech}
                isSpeaking={isSpeaking}
                messagesEndRef={messagesEndRef}
              />
            )}

            {activeTab === "livecall" && <LiveCallTab />}

            {/* EMPTY EXPLORE TAB (for now) */}
            {activeTab === "explore" && <ExplorerTab />}


            <div ref={messagesEndRef} />
          </div>

          {/* BOTTOM TABS */}
          <div
            style={{
              borderTop: "1px solid #e2e8f0",
              background: "white",
              display: "flex",
              justifyContent: "space-around",
              padding: "10px 0",
            }}
          >
            {/* Chat */}
            <button
              onClick={() => setActiveTab("chat")}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: activeTab === "chat" ? "#2563eb" : "#64748b",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
              }}
            >
              <MessageSquare size={22} />
              Chat
            </button>

            {/* Live Call */}
            <button
              onClick={() => setActiveTab("livecall")}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: activeTab === "livecall" ? "#2563eb" : "#64748b",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
              }}
            >
              <PhoneCall size={26} />
              Voice
            </button>

            {/* Explore */}
            <button
              onClick={() => setActiveTab("explore")}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: activeTab === "explore" ? "#2563eb" : "#64748b",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
              }}
            >
              <Compass size={22} />
              Explore
            </button>
          </div>
        </div>
      )}
    </>
  );
}
