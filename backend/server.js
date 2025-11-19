import express from "express";
import cors from "cors";
import fs from "fs";
import dotenv from "dotenv";
import OpenAI from "openai";
import path from "path";
import mammoth from "mammoth";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors({ origin: ["http://localhost:3000", "http://localhost:3001", "http://localhost:3002", "http://localhost:5173"], methods: ["GET", "POST"] }));
app.use(express.json());

// === SUPABASE ===
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// === OPENAI CONFIG ===
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// === SETTINGS ===
const DOCS_DIR = path.join(__dirname, "upload");
const EMBEDDING_MODEL = "text-embedding-3-large";
const LLM_MODEL_RAG = "gpt-4o-mini";
const LLM_MODEL_FALLBACK = "gpt-4o";

let documentChunks = [];
let chunkEmbeddings = [];
let knowledgeBaseLoaded = false;

// =======================
// UTILITIES
// =======================
function cosineSimilarity(a, b) {
  const dot = a.reduce((sum, ai, i) => sum + ai * b[i], 0);
  const magA = Math.sqrt(a.reduce((sum, ai) => sum + ai * ai, 0));
  const magB = Math.sqrt(b.reduce((sum, bi) => sum + bi * bi, 0));
  return dot / (magA * magB);
}

// ✅ Semantic chunking for better context retention
function chunkText(text, file, maxWords = 180) {
  const sentences = text.split(/(?<=[.?!])\s+/);
  const chunks = [];
  let current = [];
  let wordCount = 0;

  for (let sentence of sentences) {
    const words = sentence.split(" ");
    if (wordCount + words.length > maxWords) {
      chunks.push({ text: current.join(" ").trim(), source: file });
      current = [];
      wordCount = 0;
    }
    current.push(sentence);
    wordCount += words.length;
  }

  if (current.length > 0) chunks.push({ text: current.join(" ").trim(), source: file });

  // Add overlap for continuity
  for (let i = 1; i < chunks.length; i++) {
    const prev = chunks[i - 1].text.split(" ").slice(-25).join(" ");
    chunks[i].text = prev + " " + chunks[i].text;
  }

  return chunks;
}

// =======================
// LOAD DOCUMENTS + BUILD EMBEDDINGS
// =======================
async function loadDocuments() {
  try {
    console.log("📂 Loading Tekisho documents...");
    const files = fs.readdirSync(DOCS_DIR).filter((f) => f.match(/\.(pdf|docx|doc)$/i));

    if (files.length === 0) {
      console.warn("⚠️ No documents found in /upload folder.");
      return;
    }

    let allChunks = [];
    for (const file of files) {
      const filePath = path.join(DOCS_DIR, file);
      let text = "";

      if (file.endsWith(".pdf")) {
        const pdfParse = (await import("pdf-parse")).default;
        const data = await pdfParse(fs.readFileSync(filePath));
        text = data.text || "";
      } else {
        const result = await mammoth.extractRawText({ path: filePath });
        text = result.value || "";
      }

      console.log(`✅ Loaded ${file} (${text.length} chars)`);
      allChunks.push(...chunkText(text, file));
    }

    documentChunks = allChunks;
    console.log(`✂️ Split into ${documentChunks.length} semantic chunks.`);

    const cachePath = path.join(__dirname, "embeddings_cache.json");
    if (fs.existsSync(cachePath)) {
      const cached = JSON.parse(fs.readFileSync(cachePath, "utf8"));
      if (cached.chunks?.length === documentChunks.length) {
        console.log("⚡ Using cached embeddings...");
        chunkEmbeddings = cached.embeddings;
        knowledgeBaseLoaded = true;
        return;
      }
    }

    console.log("🔢 Creating embeddings...");
    const responses = await openai.embeddings.create({
      model: EMBEDDING_MODEL,
      input: documentChunks.map((c) => c.text),
    });

    chunkEmbeddings = responses.data.map((d) => d.embedding);
    knowledgeBaseLoaded = true;

    fs.writeFileSync(
      path.join(__dirname, "embeddings_cache.json"),
      JSON.stringify({ chunks: documentChunks, embeddings: chunkEmbeddings }, null, 2)
    );
    console.log("🧠 Knowledge base ready and cached!");
  } catch (err) {
    console.error("❌ Error loading documents:", err);
  }
}

await loadDocuments();

// =======================
// GREETING + FILTERS
// =======================
function isGreetingOrNameMention(text) {
  const lower = text.toLowerCase();
  return /^(hi|hello|hey|hiya|howdy)\b/.test(lower) || /\baria\b/.test(lower);
}
function isIrrelevantQuestion(text) {
  const irrelevant = ["movie", "actor", "song", "sports", "joke", "weather", "travel", "politics"];
  return irrelevant.some((kw) => text.toLowerCase().includes(kw));
}

// =======================
// RETRIEVAL
// =======================
async function retrieveRelevantChunks(query, topK = 6) {
  let expandedQuery = query;

  if (/\bproducts?\b/i.test(query)) {
    expandedQuery +=
      " Tekisho’s AI products, platforms, and proprietary tools such as AVA, AVI, ZPOS, Frontlyne, RAG, AI Automation, and Chatbots.";
  } else if (/\bservices?\b/i.test(query)) {
    expandedQuery +=
      " Tekisho’s enterprise services including SAP, integration, cloud, AI automation, cybersecurity, and consulting.";
  } else {
    expandedQuery += " Tekisho’s AI offerings, solutions, innovations, and expertise.";
  }

  const embedding = (await openai.embeddings.create({ model: EMBEDDING_MODEL, input: expandedQuery })).data[0].embedding;
  const sims = chunkEmbeddings.map((emb, i) => ({ i, sim: cosineSimilarity(embedding, emb) }));
  sims.sort((a, b) => b.sim - a.sim);

  const filtered = sims.filter((s) => s.sim > 0.6).slice(0, topK);
  console.log(`📊 Retrieved ${filtered.length} chunks with similarity > 0.6`);

  return filtered.map((s) => documentChunks[s.i]);
}

// =======================
// ASK ENDPOINT (CLEAN OUTPUT)
// =======================
app.post("/ask", async (req, res) => {
  try {
    const { question } = req.body;
    if (!question) return res.status(400).json({ error: "Question is required" });

    console.log(`🎯 User Question: "${question}"`);

    if (isGreetingOrNameMention(question)) {
      return res.json({
        answer: "Hi, I’m Aria — your AI assistant at Tekisho Infotech. How can I assist you today?",
        source: "greeting",
      });
    }

    if (isIrrelevantQuestion(question)) {
      return res.json({
        answer: "⚠️ I can only answer questions related to Tekisho Infotech’s products, services, and AI solutions.",
        source: "restricted",
      });
    }

    if (!knowledgeBaseLoaded) {
      return res.json({
        answer: "⚠️ Knowledge base is not yet ready. Please try again shortly.",
        source: "system",
      });
    }

    // =======================
    // CONTACT INTENT HANDLING  
    // =======================
    const contactIntent = /contact|connect|reach|talk|speak|call|email|get in touch|join/i.test(question);

    // Step 1️⃣: User asks to connect but hasn't shared details yet
    if (contactIntent && !question.match(/@|[0-9]{7,}/)) {
      return res.json({
        answer:
          "Of course! Could you please share your full name, phone number, and email address so our team can reach out to you?",
        source: "contact_request",
      });
    }

    // Step 2️⃣: User provides their contact details
    if (/@/.test(question) && /[0-9]{7,}/.test(question)) {
      const extractPrompt = `
You are a strict data extractor. Extract the following fields from the given message and return them as JSON.

Examples:
Input: "m.divya,9987654321,divya123@gmail.com"
Output: {"name": "m.divya", "phone": "9987654321", "email": "divya123@gmail.com"}

Input: "My name is John Doe, you can call me at 9876543210 or email me at john@gmail.com"
Output: {"name": "John Doe", "phone": "9876543210", "email": "john@gmail.com"}

Text: "${question}"
If any field is missing, leave it as an empty string. Return the result as a JSON object.
`;

      let parsed = {};

      try {
        const extractResponse = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [{ role: "user", content: extractPrompt }],
          temperature: 0,
          response_format: { type: "json_object" }, // structured JSON output
        });

        const raw = extractResponse.choices?.[0]?.message?.content;
        if (raw) {
          parsed = JSON.parse(raw);
        } else {
          console.warn("⚠️ Empty OpenAI response for contact extraction");
        }
      } catch (err) {
        console.error("⚠️ OpenAI extraction error:", err);
      }

  const { name, phone, email } = parsed;

  if (!name || !phone || !email) {
    return res.json({
      answer:
        "I couldn’t catch all your details. Could you please share your full name, phone number, and email together?",
      source: "contact_retry",
    });
  }

  // ✅ Save to Supabase
  try {
    const { error } = await supabase.from("contacts").insert([{ name, phone, email }]);
    if (error) {
      console.error("⚠️ Supabase insert error:", error.message);
      return res.status(500).json({ answer: "⚠️ Internal server error while saving contact.", source: "error" });
    }
  } catch (err) {
    console.error("⚠️ Unexpected Supabase error:", err);
    return res.status(500).json({ answer: "⚠️ Internal server error while saving contact.", source: "error" });
  }

      return res.json({
        answer: `Thank you${name ? `, ${name}` : ""}! Our team will reach out to you soon at ${email}.`,
        source: "contact_confirmation",
      });
    }

    const relevantChunks = await retrieveRelevantChunks(question, 8);

    // =======================
    // UNIVERSAL TOPIC REDIRECTION (For ALL Topics)
    // =======================
    const stopWords = new Set([
      "the","and","for","that","this","with","from","are","was","were","has","had","have",
      "our","your","their","its","but","not","you","we","they","she","him","her","his",
      "can","may","will","shall","could","would","should","a","an","in","of","on","at",
      "to","is","as","by","it","or","be","us","about","more","into","also","tekisho","infotech",
      "what","how","why","when","where","which","who","does","do","did","can","will","would",
      "tell","me","i","am","my","you","your","get","give","know","need","want","like","use",
      "service","services","company","companies","business","businesses","technology","technologies"
    ]);

    // NEW APPROACH: Find question words that appear in knowledge base
    const questionWords = question.toLowerCase().split(/\W+/).filter(w => w.length >= 3 && !stopWords.has(w));
    
    const topicCandidates = {};
    for (const qWord of questionWords) {
      let totalCount = 0;
      for (const chunk of relevantChunks) {
        const chunkText = chunk.text.toLowerCase();
        const wordCount = (chunkText.match(new RegExp(`\\b${qWord}\\b`, 'g')) || []).length;
        totalCount += wordCount;
      }
      if (totalCount > 0) {
        topicCandidates[qWord] = totalCount;
      }
    }

    // Also get frequent words from chunks that match question context
    const chunkWords = {};
    for (const chunk of relevantChunks) {
      const words = chunk.text.toLowerCase().split(/\W+/);
      for (const w of words) {
        if (w.length < 3 || stopWords.has(w)) continue;
        chunkWords[w] = (chunkWords[w] || 0) + 1;
      }
    }

    // Combine and prioritize question words
    const combinedTopics = { ...chunkWords };
    for (const [word, count] of Object.entries(topicCandidates)) {
      combinedTopics[word] = (combinedTopics[word] || 0) + count * 3; // Boost question words
    }

    const sortedTopics = Object.entries(combinedTopics)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    const mainTopic = sortedTopics[0]?.[0] || null;

    // Enhanced matching logic
    const topicMatch = mainTopic && questionWords.includes(mainTopic.toLowerCase());
    const partialMatch = mainTopic && question.toLowerCase().includes(mainTopic.toLowerCase());
    
    console.log(`🎯 Topic Analysis: questionWords=[${questionWords.join(', ')}], mainTopic="${mainTopic}", topicMatch=${topicMatch}, partialMatch=${partialMatch}`);

    if (mainTopic && (topicMatch || partialMatch) && relevantChunks.length > 0) {
      console.log(`✅ Topic redirection triggered for: ${mainTopic}`);

      // Short 1-line real definition
      const defResponse = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "user",
            content: `Give a short one-line definition for "${mainTopic}" in under 20 words. No extra text, just the definition.`,
          },
        ],
        temperature: 0.2
      });

      const topicDefinition = defResponse.choices[0].message.content.trim();

      // Create exactly 5 subtopics
      const subtopics = sortedTopics
        .map(t => t[0])
        .filter(t => t !== mainTopic && t.length > 2)
        .slice(0, 5)
        .map(t => `${mainTopic.toUpperCase()} ${t.charAt(0).toUpperCase() + t.slice(1)}`);

      // Ensure we have at least some subtopics
      if (subtopics.length === 0) {
        subtopics.push(
          `${mainTopic.toUpperCase()} Services`,
          `${mainTopic.toUpperCase()} Solutions`, 
          `${mainTopic.toUpperCase()} Implementation`,
          `${mainTopic.toUpperCase()} Support`,
          `${mainTopic.toUpperCase()} Strategy`
        );
      }

      return res.json({
        answer:
          `${topicDefinition}\n` +
          `${mainTopic.toUpperCase()} is one of Tekisho's key focus areas. ` +
          `Would you like to explore more about:\n${subtopics.slice(0, 5).join(", ")}?`,
        source: "topic_redirect"
      });
    }

    const combinedContext = relevantChunks.map((c) => `${c.source}:\n${c.text}`).join("\n\n");

    const ragPrompt = `
You are Aria, Tekisho Infotech’s official AI assistant.

Context:
${combinedContext}

Question:
${question}

Instructions:
- Answer clearly in 2–4 sentences maximum.
- Be concise, factual, and to the point.
- Use plain text only (no markdown, no lists, no formatting).
- Do not repeat or rephrase the question.
- If asked about PRODUCTS or SERVICES, summarize only the key offerings in short form.
- Never include or mention the word FALLBACK.
- If no relevant info exists, respond with exactly: FALLBACK.
`;

    const ragResponse = await openai.chat.completions.create({
      model: LLM_MODEL_RAG,
      messages: [{ role: "user", content: ragPrompt }],
      temperature: 0.1,
      max_tokens: 250
    });

    let ragAnswer = ragResponse.choices?.[0]?.message?.content?.trim() || "";

    // 🧹 Cleanup
    ragAnswer = ragAnswer
      .replace(/\*\*/g, "")
      .replace(/\*/g, "")
      .replace(/```/g, "")
      .replace(/\bFALLBACK\b.*$/i, "")
      .replace(/\s{2,}/g, " ")
      .trim();

    if (!ragAnswer || ragAnswer.toUpperCase() === "FALLBACK") {
      console.log("⚠️ Using fallback model due to empty context.");
      const fallback = await openai.chat.completions.create({
        model: LLM_MODEL_FALLBACK,
        messages: [
          {
            role: "user",
            content: `You are Aria, Tekisho Infotech’s assistant. Please answer briefly and clearly: "${question}"`,
          },
        ],
        temperature: 0.4,
      });

      ragAnswer =
        fallback.choices?.[0]?.message?.content?.trim().replace(/\*\*/g, "").replace(/\*/g, "") ||
        "Sorry, I couldn’t find relevant information.";
      return res.json({ answer: ragAnswer, source: "fallback" });
    }

    res.json({ answer: ragAnswer, source: "knowledge_base" });
  } catch (err) {
    console.error("❌ Error:", err);
    res.status(500).json({ answer: "⚠️ Internal server error.", source: "error" });
  }
});

// =======================
// FEEDBACK ENDPOINT
// =======================
app.post("/feedback", async (req, res) => {
  const { message } = req.body;
  if (!message) return res.status(400).json({ error: "Feedback message required" });

  try {
    await supabase.from("feedback").insert([{ message }]);
    res.json({ success: true, message: "Thanks for your feedback!" });
  } catch (err) {
    console.error("❌ Feedback error:", err);
    res.status(500).json({ error: "Failed to save feedback" });
  }
});

// =======================
// HEALTH CHECK
// =======================
app.get("/health", (req, res) => {
  res.json({
    status: "✅ Aria RAG System Running",
    loadedChunks: documentChunks.length,
    embeddings: chunkEmbeddings.length,
  });
});

// =======================
// START SERVER
// =======================
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Aria backend live at http://localhost:${PORT}`));
