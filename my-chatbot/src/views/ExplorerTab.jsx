// src/views/ExplorerTab.jsx
import React, { useState } from "react";
import "./ExplorerTab.css";

export default function ExplorerTab() {
  const sections = [
    {
      title: "LEADQ.AI",
      subtitle: "",
      items: ["Overview", "How it works", "Upload Assets", "Export Settings"],
    },
    {
      title: "RightDoc.AI",
      subtitle: " ",
      items: ["Intro", "Avatar Controls", "Scene Generation"],
    },
    {
      title: "ZPOS.AI",
      subtitle: " ",
      items: ["Create Asset", "Templates", "Video Effects", "Rendering"],
    },
    {
      title: "Presence",
      subtitle: " ",
      items: [
        "Introduction",
        "Installation Guide",
        "First AI Video",
        "Voice Settings",
        "Using Templates",
        "Troubleshooting",
      ],
    },
    {
      title: "Autonomous Voice Agent",
      subtitle: " ",
      items: [
        "Create Personalized Clips",
        "Audience Segmentation",
        "Custom Script Writing",
      ],
    },
  ];

  const [openIndex, setOpenIndex] = useState(null);

  const toggleSection = (i) => {
    setOpenIndex(openIndex === i ? null : i);
  };

  return (
    <div className="explorer-container">
      <div className="explorer-video">
        <video
          src="/veda.mp4"
          className="explorer-veda"
          controls
          loop
          muted
          playsInline
          style={{ maxWidth: "100%", height: "auto", borderRadius: 8 }}
        >
          Your browser does not support the video tag.
        </video>
      </div>

      <div className="explorer-list">
        {sections.map((sec, i) => (
          <div key={i} className="explorer-section">
            <div className="explorer-header" onClick={() => toggleSection(i)}>
              <span className="explorer-header-text">
                {sec.title}
                {sec.subtitle && (
                  <span className="explorer-subtitle">{sec.subtitle}</span>
                )}
              </span>

              <span className="explorer-arrow">
                {openIndex === i ? "▾" : "▸"}
              </span>
            </div>

            {openIndex === i && (
              <div className="explorer-items">
                {sec.title === "LEADQ.AI" ? (
                  <div className="explorer-item leadq-item-single">
                    <video
                      src="/leadq.ai.mp4"
                      className="item-video"
                      controls
                      playsInline
                      muted
                    >
                      Your browser does not support the video tag.
                    </video>
                  </div>
                ) : (
                  sec.items.map((item, j) => (
                    <div key={j} className="explorer-item">
                      {item}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
