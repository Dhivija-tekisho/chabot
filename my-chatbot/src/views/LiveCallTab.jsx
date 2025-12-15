import React, { useState, useRef } from "react";
import { Mic, MicOff } from "lucide-react";

const LiveCallTab = () => {
  const [isCalling, setIsCalling] = useState(false);
  const [status, setStatus] = useState("Tap microphone to talk with Veda 🎤");
  const pcRef = useRef(null);
  const remoteAudioRef = useRef(null);

  const startCall = async () => {
    try {
      setStatus("Connecting to Veda...");

      // Request realtime session from backend
      const resp = await fetch("http://localhost:5000/realtime-session");
      const session = await resp.json();

      console.log("Session received:", session);

      const secret = session.client_secret?.value;
      if (!secret) {
        console.error("Missing client_secret:", session);
        setStatus("No access token from server ❌");
        return;
      }

      const pc = new RTCPeerConnection({
        iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
      });

      pc.ontrack = (event) => {
        console.log("🔊 Audio received from AI");

        // Start wave animation when AI speaks
        document.querySelectorAll(".wave-bar").forEach((bar) => {
          bar.style.animationPlayState = "running";
        });

        remoteAudioRef.current.srcObject = event.streams[0];
      };

      // Get microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      // Send WebRTC offer to OpenAI server
      const sdpResp = await fetch(
        "https://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/sdp",
            Authorization: `Bearer ${secret}`,
            "OpenAI-Beta": "realtime=v1",
          },
          body: offer.sdp,
        }
      );

      const answer = await sdpResp.text();
      await pc.setRemoteDescription({ type: "answer", sdp: answer });

      pcRef.current = pc;
      setIsCalling(true);
      setStatus("🎤 Listening… Speak now!");
    } catch (error) {
      console.error("Realtime error:", error);
      setStatus("Failed to connect. Try again ❌");
    }
  };

  const endCall = () => {
    if (pcRef.current) {
      pcRef.current.getSenders().forEach((sender) => sender.track?.stop());
      pcRef.current.close();
      pcRef.current = null;
    }

    // Stop animation when call ends
    document.querySelectorAll(".wave-bar").forEach((bar) => {
      bar.style.animationPlayState = "paused";
    });

    setIsCalling(false);
    setStatus("📴 Call ended. Tap mic to talk again.");
  };

  return (
    <div
      style={{
        padding: "30px",
        textAlign: "center",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
      }}
    >
      <p style={{ marginBottom: "20px", fontSize: "1.1rem", color: "#444" }}>
        {status}
      </p>

      {/* Wave Animation */}
      {isCalling && (
        <div
          id="voice-wave"
          style={{
            width: "120px",
            height: "50px",
            margin: "0 auto 20px",
            display: "flex",
            alignItems: "flex-end",
            gap: "4px",
          }}
        >
          {[...Array(5)].map((_, i) => (
            <div key={i} className="wave-bar"></div>
          ))}
        </div>
      )}

      <button
        onClick={isCalling ? endCall : startCall}
        style={{
          background: isCalling ? "#dc2626" : "#22c55e",
          color: "white",
          border: "none",
          padding: "18px 30px",
          fontSize: "18px",
          borderRadius: "100px",
          cursor: "pointer",
          display: "flex",
          gap: "10px",
          justifyContent: "center",
          alignItems: "center",
          boxShadow: "0 8px 20px rgba(0,0,0,0.15)",
          transition: "0.2s",
        }}
      >
        {isCalling ? <MicOff size={20} /> : <Mic size={20} />}
        {isCalling ? "End Call" : "Tap to Talk"}
      </button>

      {/* Audio received from AI */}
      <audio ref={remoteAudioRef} autoPlay style={{ display: "none" }} />
    </div>
  );
};

export default LiveCallTab;
