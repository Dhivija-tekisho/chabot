// src/FeedbackTab.jsx
import React from "react";

export default function FeedbackTab({ feedback, setFeedback, onSubmit }) {
  return (
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
        onClick={onSubmit}
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
  );
}
