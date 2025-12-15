import multer from "multer";
import { openai } from "../providers/openaiProvider.js";
import { handleUserQuestion } from "./../services/ragService.js";

// File handler for receiving audio
export const upload = multer({ storage: multer.memoryStorage() });

export async function processVoice(audioBuffer) {
  try {
    // Convert speech -> text
    const transcription = await openai.audio.transcriptions.create({
      file: audioBuffer,
      model: "gpt-4o-mini-tts", // Speech recognition
      response_format: "text",
    });

    const text = transcription.text || "Sorry, I didn't catch that.";

    // Ask chatbot brain
    const result = await handleUserQuestion(text);

    // Convert text -> speech
    const ttsVoice = process.env.TTS_VOICE || "verse";

    const ttsResponse = await openai.audio.speech.create({
      model: "gpt-4o-mini-tts", // Text-to-speech model
      voice: ttsVoice,
      input: result.answer,
      format: "mp3",
    });

    const audioOut = Buffer.from(await ttsResponse.arrayBuffer());

    return {
      text: result.answer,
      audio: audioOut.toString("base64"),
      followUps: result.followUps,
    };
  } catch (error) {
    console.error("Voice processing error:", error);
    return {
      text: "⚠️ Voice processing failed",
      audio: null,
      followUps: [],
    };
  }
}
