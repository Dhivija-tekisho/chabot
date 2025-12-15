/**
 * app.js - Single-file backend (RAG + realtime session + feedback + Swagger)
 *
 * NOTE: keep your .env in the same folder and restart node after changes.
 */

import express from "express";
import cors from "cors";
import fs from "fs";
import dotenv from "dotenv";
import OpenAI from "openai";
import path from "path";
import mammoth from "mammoth";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";
import fetch from "node-fetch";
import multer from "multer";

// LangChain + Qdrant imports
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { QdrantVectorStore } from "@langchain/qdrant";
import { QdrantClient } from "@qdrant/js-client-rest";
import { OpenAIEmbeddings } from "@langchain/openai";

// Swagger
import swaggerUi from "swagger-ui-express";
import swaggerJsdoc from "swagger-jsdoc";

dotenv.config();

// ---------------------
// BASIC SETUP
// ---------------------
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const upload = multer();
const app = express();

app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "http://localhost:3001",
      "http://localhost:3002",
      "http://localhost:5173",
    ],
    methods: ["GET", "POST"],
  })
);
app.use(express.json({ limit: "10mb" })); // allow larger payloads if needed

// ---------------------
// SUPABASE
// ---------------------
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

// ---------------------
// OPENAI
// ---------------------
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ---------------------
// RAG SETTINGS
// ---------------------
// IMPORTANT: docs live in backend/upload (one level up from src)
const DOCS_DIR = path.join(__dirname, "../upload");
const EMBEDDING_MODEL = "text-embedding-3-large";
const LLM_MODEL_RAG = "gpt-4o-mini";
const LLM_MODEL_FALLBACK = "gpt-4o";
const CHUNK_SIZE = 1000;
const CHUNK_OVERLAP = 200;

const QDRANT_COLLECTION = "tekisho_docs";

const qdrantClient = new QdrantClient({
  url: process.env.QDRANT_URL,
  apiKey: process.env.QDRANT_API_KEY,
});

const embeddingsEngine = new OpenAIEmbeddings({
  model: EMBEDDING_MODEL,
  openAIApiKey: process.env.OPENAI_API_KEY,
});

const textSplitter = new RecursiveCharacterTextSplitter({
  chunkSize: CHUNK_SIZE,
  chunkOverlap: CHUNK_OVERLAP,
});

let vectorStore = null;
let knowledgeBaseLoaded = false;

// -------------------------------------------------------------
// SWAGGER SETUP
// -------------------------------------------------------------
// ---------------------
// SWAGGER SETUP
// ---------------------
const swaggerOptions = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Veda Backend API",
      version: "1.0.0",
      description: "APIs for Veda chatbot (ask, feedback, realtime-session, health).",
    },
    servers: [{ url: `http://localhost:${process.env.PORT || 5000}` }],
  },

  // 👇 Tell Swagger where the API documentation lives
  apis: [path.join(__dirname, "app.js")],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));


// -------------------------------------------------------------
// HELPER: Load Documents into Qdrant (RAG)
// -------------------------------------------------------------
async function loadDocuments() {
  try {
    console.log("📂 Loading Tekisho documents...");

    if (!fs.existsSync(DOCS_DIR)) {
      console.warn(`⚠️ Docs dir not found: ${DOCS_DIR}`);
      return;
    }

    const files = fs
      .readdirSync(DOCS_DIR)
      .filter((f) => f.match(/\.(pdf|docx|doc)$/i));

    if (files.length === 0) {
      console.warn("⚠️ No documents found.");
      return;
    }

    const allDocs = [];

    for (const file of files) {
      const filePath = path.join(DOCS_DIR, file);
      let text = "";

      if (file.toLowerCase().endsWith(".pdf")) {
        // optional: pdf parsing if pdf-parse is present
        try {
          const pdfParse = (await import("pdf-parse")).default;
          const data = await pdfParse(fs.readFileSync(filePath));
          text = data.text || "";
        } catch (e) {
          console.warn("Unable to parse PDF using pdf-parse; falling back to mammoth for docx:", e.message);
          const result = await mammoth.extractRawText({ path: filePath });
          text = result.value || "";
        }
      } else {
        const result = await mammoth.extractRawText({ path: filePath });
        text = result.value || "";
      }

      const docs = await textSplitter.createDocuments([text], [{ source: file }]);
      allDocs.push(...docs);
    }

    vectorStore = await QdrantVectorStore.fromDocuments(allDocs, embeddingsEngine, {
      client: qdrantClient,
      collectionName: QDRANT_COLLECTION,
    });

    knowledgeBaseLoaded = true;
    console.log("🧠 Knowledge base ready!");
  } catch (err) {
    console.error("❌ Error loading documents:", err);
  }
}

await loadDocuments();

// -------------------------------------------------------------
// FILTERS / HELPERS
// -------------------------------------------------------------
function isGreetingOrNameMention(text) {
  const lower = (text || "").toLowerCase();
  return /^(hi|hello|hey|hiya|howdy)\b/.test(lower) || /\bveda\b/.test(lower);
}

const irrelevantKeywords = [
  "movie",
  "actor",
  "song",
  "sports",
  "joke",
  "weather",
  "travel",
  "politics",
];

function isIrrelevantQuestion(text) {
  if (!text) return false;
  const lower = text.toLowerCase();
  return irrelevantKeywords.some((kw) => lower.includes(kw));
}

async function retrieveRelevantChunks(query, topK = 6) {
  if (!vectorStore) return [];

  let expandedQuery = query;
  if (/\bproducts?\b/i.test(query)) {
    expandedQuery += " Tekisho's AI products, platforms, solutions like AVA, AVI, ZPOS, Chatbots.";
  } else if (/\bservices?\b/i.test(query)) {
    expandedQuery += " Tekisho's enterprise services including SAP, cloud, automation, cybersecurity.";
  } else {
    expandedQuery += " Tekisho's AI capabilities and business domains.";
  }

  try {
    const retriever = vectorStore.asRetriever({ k: topK });
    const docs = await retriever.invoke(expandedQuery);

    return docs.map((d) => ({
      text: d.pageContent,
      source: d.metadata?.source || "unknown",
      metadata: d.metadata,
      pageContent: d.pageContent,
    }));
  } catch (err) {
    console.warn("Retriever error:", err);
    return [];
  }
}

async function generateFollowUps(topic) {
  try {
    const prompt = `
Suggest 3 very short follow-up questions about:
${topic}
No numbering, under 8 words each.
`;
    const r = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.4,
      max_tokens: 60,
    });

    const raw = r.choices?.[0]?.message?.content || "";
    return raw
      .split("\n")
      .map((q) => q.trim())
      .filter((q) => q.length > 0)
      .slice(0, 3);
  } catch (err) {
    console.warn("Follow-ups generation failed:", err?.message ?? err);
    return [];
  }
}

// This helper will be used by realtime or other voice flows to answer using RAG
async function processRealtimeTranscript(transcript) {
  const question = (transcript || "").trim();
  if (!question) return { answer: "", source: "empty" };

  const chunks = await retrieveRelevantChunks(question, 6);
  if (!chunks || chunks.length === 0) {
    return {
      answer:
        "⚠️ I can only answer questions based on Tekisho Infotech documents you've provided. I don't have information on that topic.",
      source: "restricted",
    };
  }

  const context = chunks.map((c) => `${c.source}:\n${c.text}`).join("\n\n");

  const ragPrompt = `
You are Veda, Tekisho Infotech's AI assistant.
Use ONLY the CONTEXT below to answer the question. If the context does not contain enough information to answer, respond EXACTLY with: FALLBACK

Context:
${context}

Question:
${question}

Guidelines:
- 1-3 short sentences.
- Plain text only.
- If no relevant info exists in the context, reply EXACTLY: FALLBACK
`;

  const ragRes = await openai.chat.completions.create({
    model: LLM_MODEL_RAG,
    messages: [{ role: "user", content: ragPrompt }],
    temperature: 0.0,
    max_tokens: 180,
  });

  const answer = (ragRes?.choices?.[0]?.message?.content || "").trim();
  if (answer === "FALLBACK") {
    return {
      answer:
        "⚠️ I can only answer questions based on Tekisho Infotech documents you've provided. I don't have information on that topic.",
      source: "restricted",
    };
  }
  return { answer, source: "knowledge_base" };
}

// -------------------------------------------------------------
// ROUTES
// -------------------------------------------------------------

/**
 * @swagger
 * /ask:
 *   post:
 *     summary: Ask chatbot a question
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               question:
 *                 type: string
 *     responses:
 *       200:
 *         description: Chatbot response
 */
app.post("/ask", async (req, res) => {
  try {
    const { question } = req.body;
    if (!question) return res.status(400).json({ error: "Question is required" });

    console.log(`🎯 User Question: "${question}"`);

    // Block irrelevant topics
    if (isIrrelevantQuestion(question)) {
      return res.json({
        answer:
          "⚠️ I can help with Tekisho Infotech, our services, and general IT/AI topics. Please ask something related.",
        followUps: [
          "What services do you offer?",
          "How can Tekisho help with AI?",
          "How do I contact support?",
        ],
        source: "restricted",
      });
    }

    // Greetings
    if (isGreetingOrNameMention(question)) {
      const followUps = await generateFollowUps(question);
      return res.json({
        answer: "Hi, I'm Veda — your AI assistant at Tekisho Infotech. How can I assist you today?",
        followUps,
        source: "greeting",
      });
    }

    if (!knowledgeBaseLoaded) {
      return res.json({
        answer: "⏳ Knowledge base is still loading. Please try again shortly.",
        followUps: [],
        source: "system",
      });
    }

    // Contact intent (simple)
    const contactIntent = /contact|connect|reach|talk|speak|call|email/i.test(question);
    if (contactIntent && !question.match(/@|[0-9]{7,}/)) {
      return res.json({
        answer: "Sure! Please share your full name, phone number, and email so we can contact you.",
        followUps: [],
        source: "contact_request",
      });
    }

    // If question contains phone + email → extract & save
    if (/@/.test(question) && /[0-9]{7,}/.test(question)) {
      const extractPrompt = `
Extract name, phone, and email from this text:
"${question}"
Return JSON only.
`;

      const ext = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: extractPrompt }],
        response_format: { type: "json_object" },
        temperature: 0,
      });

      let parsed = {};
      try {
        parsed = JSON.parse(ext.choices[0].message.content);
      } catch (e) {
        console.warn("Contact extraction parse failed:", e.message);
        parsed = {};
      }

      const { name, phone, email } = parsed;

      if (!name || !phone || !email) {
        return res.json({
          answer: "Please provide your full name, phone number, and email together.",
          followUps: [],
          source: "contact_retry",
        });
      }

      try {
        await supabase.from("contacts").insert([{ name, phone, email }]);
      } catch (e) {
        console.error("Supabase insert error:", e);
      }

      return res.json({
        answer: `Thank you, ${name}! Our team will contact you soon at ${email}.`,
        followUps: [],
        source: "contact_confirmation",
      });
    }

    // RAG retrieval
    const chunks = await retrieveRelevantChunks(question, 8);
    const context = chunks.map((c) => `${c.source}:\n${c.text}`).join("\n\n");

    const ragPrompt = `
You are Veda, Tekisho Infotech's AI assistant.

Context:
${context}

Question:
${question}

Guidelines:
- Respond in 2–4 concise sentences.
- Plain text only.
- Do NOT repeat the question.
- If no relevant info exists, answer EXACTLY: FALLBACK
`;

    const ragRes = await openai.chat.completions.create({
      model: LLM_MODEL_RAG,
      messages: [{ role: "user", content: ragPrompt }],
      temperature: 0.15,
      max_tokens: 200,
    });

    let answer = (ragRes?.choices?.[0]?.message?.content || "").trim();

    if (!answer || answer.toUpperCase() === "FALLBACK") {
      // fallback model
      const fallback = await openai.chat.completions.create({
        model: LLM_MODEL_FALLBACK,
        messages: [{ role: "user", content: `Answer clearly and briefly: "${question}"` }],
        temperature: 0.4,
      });

      answer = (fallback?.choices?.[0]?.message?.content || "").trim();
      const followUps = await generateFollowUps(question);

      return res.json({ answer, followUps, source: "fallback" });
    }

    const followUps = await generateFollowUps(question);
    return res.json({ answer, followUps, source: "knowledge_base" });
  } catch (err) {
    console.error("❌ ASK ERROR:", err);
    return res.status(500).json({
      answer: "⚠️ Something went wrong.",
      followUps: [],
      source: "error",
    });
  }
});

/**
 * @swagger
 * /feedback:
 *   post:
 *     summary: Submit feedback
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               message:
 *                 type: string
 *     responses:
 *       200:
 *         description: saved
 */
app.post("/feedback", async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) return res.status(400).json({ error: "Feedback message required" });

    await supabase.from("feedback").insert([{ message }]);
    res.json({ success: true, message: "Thanks for your feedback!" });
  } catch (err) {
    console.error("❌ Feedback error:", err);
    res.status(500).json({ error: "Failed to save feedback" });
  }
});

/**
 * @swagger
 * /realtime-session:
 *   get:
 *     summary: Create OpenAI realtime session (returns client_secret)
 *     responses:
 *       200:
 *         description: client_secret object
 */
app.get("/realtime-session", async (req, res) => {
  try {
    // NOTE: Only send supported parameters. Do NOT include deprecated turn_detection or voice fields.
    const response = await fetch("https://api.openai.com/v1/realtime/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-realtime-preview",
        instructions: `
You are Veda, Tekisho's company assistant.
- Answer ONLY using information from Tekisho documents and services.
- If the answer is not in Tekisho context, respond: "I can only answer Tekisho-related questions based on our documents."
- Keep responses concise (1-3 short sentences), friendly, and professional.
- Do NOT invent facts outside the provided company knowledge.
        `,
      }),
    });

    const data = await response.json();
    console.log("Realtime Session Response:", data);

    if (!data?.client_secret?.value) {
      console.error("OpenAI realtime session error (no client_secret):", data);
      return res.status(500).json({ error: "OpenAI did not return client_secret", raw: data });
    }

    res.json({ client_secret: data.client_secret });
  } catch (err) {
    console.error("Realtime Session Error:", err);
    res.status(500).json({ error: "Failed to create realtime session" });
  }
});

// OPTIONAL: endpoint to use processRealtimeTranscript directly (useful for speech-to-text flows)
app.post("/realtime-answer", async (req, res) => {
  try {
    const { transcript } = req.body;
    if (!transcript) return res.status(400).json({ error: "Transcript required" });

    const result = await processRealtimeTranscript(transcript);
    res.json(result);
  } catch (err) {
    console.error("Realtime answer error:", err);
    res.status(500).json({ error: "failed" });
  }
});

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Health check
 *     responses:
 *       200:
 *         description: status
 */
app.get("/health", (req, res) => {
  res.json({
    status: knowledgeBaseLoaded ? "✅ Veda RAG System Running" : "⏳ Loading knowledge base",
    collection: QDRANT_COLLECTION,
  });
});

// -------------------------------------------------------------
// START SERVER
// -------------------------------------------------------------
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Veda backend running at http://localhost:${PORT}`);
  console.log(`📘 Swagger docs available at http://localhost:${PORT}/docs`);
});
