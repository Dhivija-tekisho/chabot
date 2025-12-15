import express from "express";
import fetch from "node-fetch";
import dotenv from "dotenv";

dotenv.config();
const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const realtimeResp = await fetch(
      "https://api.openai.com/v1/realtime/sessions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json",
          "OpenAI-Beta": "realtime=v1",
        },
        body: JSON.stringify({
          model: "gpt-4o-realtime-preview",
          voice: process.env.TTS_VOICE || "verse",

          // OpenAI limits silence timeout to 10 seconds
          turn_detection: {
            type: "semantic_vad",
            threshold: 0.5,
            prefix_padding_ms: 300,
            silence_duration_ms: 10000, // MAX allowed
            create_response: true,
            interrupt_response: true
          },

          instructions: `
You are Veda, the Tekisho company assistant.
Speak clearly, warmly, and professionally.
Keep the session active as long as the user continues speaking.
`
        })
      }
    );

    const data = await realtimeResp.json();

    if (!data.client_secret) {
      console.error("Realtime session error:", data);
      return res.status(500).json(data);
    }

    console.log("🎧 Realtime session created!");
    res.json(data);

  } catch (err) {
    console.error("Realtime Session Failed:", err);
    res.status(500).json({ error: "Realtime session failed" });
  }
});

export default router;
