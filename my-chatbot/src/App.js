import React, { useState, useEffect, useRef } from "react";
import ChatWidget from "./views/ChatWidget";
import "./App.css";
import * as THREE from "three";
import NET from "vanta/dist/vanta.net.min";

function App() {
  const [vanta, setVanta] = useState(null);

  useEffect(() => {
    if (!vanta) {
      setVanta(
        NET({
          el: "#vanta-bg",
          THREE: THREE,
          mouseControls: true,
          touchControls: true,
          gyroControls: false,

          // ⭐ Updated Modern Colors
          color: 0xd93a1e,          // Node/line color
          backgroundColor: 0x314b50, // Background dark sleek theme

          points: 15,
          maxDistance: 20,
          spacing: 15,
        })
      );
    }
    return () => {
      if (vanta) vanta.destroy();
    };
  }, [vanta]);

  return (
    <div className="App" style={{ fontFamily: "Inter, sans-serif" }}>
      
      {/* === VANTA BACKGROUND === */}
      <div id="vanta-bg"></div>

      {/* --- Navbar --- */}
      <nav
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "20px 60px",
          background: "rgba(0,0,0,0.3)",
          backdropFilter: "blur(10px)",
          color: "white",
          position: "sticky",
          top: 0,
          zIndex: 50,
        }}
      >
        <h2 style={{ fontWeight: "700", letterSpacing: "0.5px" }}>
          Tekisho<span style={{ color: "#facc15" }}> AI</span>
        </h2>

        <div style={{ display: "flex", gap: "30px", fontWeight: "500" }}>
          <a href="#home" style={{ color: "white", textDecoration: "none" }}>Home</a>
          <a href="#services" style={{ color: "white", textDecoration: "none" }}>Services</a>
          <a href="#contact" style={{ color: "white", textDecoration: "none" }}>Contact</a>
        </div>
      </nav>

      {/* --- Hero Section --- */}
      <section
        id="home"
        style={{
          position: "relative",
          padding: "140px 20px",
          textAlign: "center",
          minHeight: "80vh",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          zIndex: 2,
        }}
      >
        <h1
          style={{
            fontSize: "3rem",
            color: "white",
            fontWeight: "700",
            marginBottom: "20px",
            textShadow: "2px 2px 6px rgba(0,0,0,0.7)",
          }}
        >
          Empowering Businesses with AI Innovation
        </h1>
        <p
          style={{
            color: "white",
            fontSize: "1.2rem",
            maxWidth: "700px",
            margin: "0 auto 30px",
            lineHeight: "1.6",
            textShadow: "1px 1px 4px rgba(0,0,0,0.7)",
          }}
        >
          Tekisho AI helps organizations unlock the full potential
          of artificial intelligence through tailored AI solutions.
        </p>

        <button
          onClick={() => window.scrollTo({ top: 700, behavior: "smooth" })}
          style={{
            backgroundColor: "rgba(255,255,255,0.12)",
            color: "white",
            padding: "12px 25px",
            borderRadius: "30px",
            border: "1px solid rgba(255,255,255,0.2)",
            cursor: "pointer",
            fontSize: "1rem",
            fontWeight: "600",
            transition: "0.2s",
          }}
        >
          Learn More
        </button>
      </section>

      {/* --- Services Section --- */}
      <section
        id="services"
        style={{
          backgroundColor: "#ffffff",
          padding: "80px 20px",
          textAlign: "center",
        }}
      >
        <h2
          style={{
            color: "#1e3a8a",
            fontSize: "2rem",
            marginBottom: "40px",
            fontWeight: "700",
          }}
        >
          Our Services
        </h2>

        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: "30px",
            flexWrap: "wrap",
            maxWidth: "1000px",
            margin: "0 auto",
          }}
        >
          {[
            {
              title: "AI & Machine Learning",
              desc: "Intelligent automation and predictive analytics.",
            },
            {
              title: "Cloud & Data Solutions",
              desc: "Secure and scalable enterprise deployments.",
            },
            {
              title: "Integration Services",
              desc: "System and API integration for efficiency.",
            },
          ].map((service, index) => (
            <div
              key={index}
              style={{
                width: "300px",
                padding: "25px",
                backgroundColor: "#f8fafc",
                borderRadius: "15px",
                boxShadow: "0 4px 10px rgba(0,0,0,0.08)",
                transition: "transform 0.3s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.transform = "translateY(-5px)")}
              onMouseLeave={(e) => (e.currentTarget.style.transform = "translateY(0)")}
            >
              <h3
                style={{
                  color: "#1e3a8a",
                  fontSize: "1.3rem",
                  marginBottom: "10px",
                }}
              >
                {service.title}
              </h3>
              <p style={{ color: "#475569", fontSize: "1rem" }}>
                {service.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* --- Contact Section --- */}
      <section
        id="contact"
        style={{
          backgroundColor: "#1e3a8a",
          color: "white",
          textAlign: "center",
          padding: "80px 20px",
        }}
      >
        <h2
          style={{
            fontSize: "2rem",
            marginBottom: "20px",
            fontWeight: "700",
          }}
        >
          Get in Touch
        </h2>
        <button
          onClick={() => alert("Contact form coming soon!")}
          style={{
            marginTop: "25px",
            backgroundColor: "#facc15",
            color: "#1e3a8a",
            padding: "12px 25px",
            borderRadius: "25px",
            border: "none",
            cursor: "pointer",
            fontWeight: "600",
          }}
        >
          Contact Us
        </button>
      </section>

      {/* --- Footer --- */}
      <footer
        style={{
          backgroundColor: "#0f172a",
          color: "#cbd5e1",
          padding: "15px",
          fontSize: "0.9rem",
          textAlign: "center",
        }}
      >
        © {new Date().getFullYear()} Tekisho AI — All Rights Reserved
      </footer>

      <ChatWidget />
    </div>
  );
}

export default App;
