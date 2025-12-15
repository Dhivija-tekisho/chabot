// src/ChatTab.jsx
import React from "react";
import { Send, Volume2, StopCircle } from "lucide-react";

export default function ChatTab({
  messages,
  isTyping,
  showSuggestions,
  suggestedQuestions,
  input,
  setInput,
  onSend,
  handleTextToSpeech,
  isSpeaking,
  messagesEndRef,
}) {
  return (
    <>
      {/* Messages */}
      <div>
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
                color: msg.type === "assistant" ? "#1e293b" : "white",
                maxWidth: "85%",
                wordWrap: "break-word",
              }}
            >
              {msg.content}
            </div>

            {/* TTS button for assistant */}
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
                {isSpeaking ? (
                  <StopCircle size={14} />
                ) : (
                  <Volume2 size={14} />
                )}
              </button>
            )}

            {/* Follow-up suggestions per message */}
            {msg.type === "assistant" &&
              msg.followUps &&
              msg.followUps.length > 0 && (
                <div
                  style={{
                    marginTop: "8px",
                    display: "flex",
                    flexWrap: "wrap",
                    gap: "6px",
                  }}
                >
                  {msg.followUps.map((fq, index) => (
                    <button
                      key={index}
                      onClick={() => onSend(fq)}
                      style={{
                        padding: "6px 10px",
                        borderRadius: "10px",
                        backgroundColor: "#e0e7ff",
                        color: "#1e3a8a",
                        fontSize: "12px",
                        border: "1px solid #2563eb44",
                        cursor: "pointer",
                      }}
                    >
                      {fq}
                    </button>
                  ))}
                </div>
              )}
          </div>
        ))}

        {isTyping && (
          <div style={{ color: "#64748b", fontSize: "14px" }}>
            Typing...
          </div>
        )}
      </div>

      {/* Global suggested questions (only when showSuggestions is true) */}
      {showSuggestions && (
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
              onClick={() => onSend(q)}
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

      {/* Input box */}
      <div
        style={{
          borderTop: "1px solid #e2e8f0",
          padding: "12px",
          display: "flex",
          gap: "8px",
          marginTop: "12px",
        }}
      >
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              onSend();
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
          onClick={() => onSend()}
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

      <div ref={messagesEndRef} />
    </>
  );
}
