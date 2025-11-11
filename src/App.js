import React from "react";
import ChatWidget from "./ChatWidget";
import "./App.css";

function App() {
  return (
    <div className="App" style={{ fontFamily: "Inter, sans-serif" }}>
      {/* --- Navbar --- */}
      <nav
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "20px 60px",
          background: "linear-gradient(90deg, #1e3a8a, #3b82f6)",
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
          <a href="#home" style={{ color: "white", textDecoration: "none" }}>
            Home
          </a>
          <a href="#services" style={{ color: "white", textDecoration: "none" }}>
            Services
          </a>
          <a href="#contact" style={{ color: "white", textDecoration: "none" }}>
            Contact
          </a>
        </div>
      </nav>

      {/* --- Hero Section --- */}
      <section
        id="home"
        style={{
          background:
            "linear-gradient(135deg, #eef2ff 0%, #e0f2fe 50%, #dbeafe 100%)",
          padding: "100px 20px",
          textAlign: "center",
        }}
      >
        <h1
          style={{
            fontSize: "3rem",
            color: "#1e3a8a",
            fontWeight: "700",
            marginBottom: "20px",
          }}
        >
          Empowering Businesses with AI Innovation
        </h1>
        <p
          style={{
            color: "#334155",
            fontSize: "1.2rem",
            maxWidth: "700px",
            margin: "0 auto 30px",
            lineHeight: "1.6",
          }}
        >
          Tekisho AI helps organizations unlock the full potential of artificial
          intelligence through tailored AI solutions, cloud integration, and
          intelligent automation.
        </p>

        <button
          onClick={() =>
            window.scrollTo({ top: 700, behavior: "smooth" })
          }
          style={{
            backgroundColor: "#1e3a8a",
            color: "white",
            padding: "12px 25px",
            borderRadius: "30px",
            border: "none",
            cursor: "pointer",
            fontSize: "1rem",
            fontWeight: "600",
            transition: "0.3s",
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
              desc: "Build intelligent systems with advanced ML models and automation to drive smarter business insights.",
            },
            {
              title: "Cloud & Data Solutions",
              desc: "Seamless migration and optimization across AWS, Azure, and Google Cloud with strong AI integration.",
            },
            {
              title: "Integration Services",
              desc: "Connect your systems, apps, and data securely for a unified and efficient digital ecosystem.",
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
              onMouseEnter={(e) =>
                (e.currentTarget.style.transform = "translateY(-5px)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.transform = "translateY(0)")
              }
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
        <p
          style={{
            fontSize: "1.1rem",
            maxWidth: "600px",
            margin: "0 auto",
            color: "#e2e8f0",
          }}
        >
          Have a project in mind or want to learn more about our AI services?
          Let’s talk about how Tekisho can help your business grow.
        </p>
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

      {/* --- Chatbot Widget (positioned fixed at bottom-right) --- */}
      <ChatWidget />
    </div>
  );
}

export default App;
