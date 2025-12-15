import fs from "fs";
import path from "path";
import mammoth from "mammoth";
import { fileURLToPath } from "url";
// import pdf from "pdf-parse";
import { qdrantClient, QDRANT_COLLECTION } from "../repositories/qdrantRepo.js";
import { openai } from "../providers/openaiProvider.js";
import { textSplitter } from "../utils/textSplitter.js";
import { QdrantVectorStore } from "@langchain/qdrant";
import { OpenAIEmbeddings } from "@langchain/openai";

const EMBEDDING_MODEL = "text-embedding-3-large";
let vectorStore = null;
let knowledgeBaseLoaded = false;
let knowledgeBasePromise = null;
let knowledgeBaseError = null;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DOCS_DIR = path.join(__dirname, "../../upload");

// ---------------------------------------------------------
// ❌ NOT ALLOWED TOPICS (Block Only These)
// ---------------------------------------------------------
const notAllowedKeywords = [
  "actor",
  "song",
  "sports",
  "joke",
  "weather",
  "travel",
  "politics",
  "cooking",
  "movie",
  "music",
  "recipe",
  "game",
];

// ---------------------------------------------------------
// SMART FOLLOW-UP QUESTIONS
// ---------------------------------------------------------
async function generateFollowUps(question) {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: `Suggest 3 short follow-up questions (max 7 words) for: ${question}. No numbering.`,
        },
      ],
      temperature: 0.4,
      max_tokens: 60,
    });

    return response.choices[0].message.content
      .split("\n")
      .filter((q) => q.trim().length > 0)
      .slice(0, 3);
  } catch {
    return [];
  }
}

// ---------------------------------------------------------
// LOAD DOCUMENTS INTO QDRANT FOR RAG
// ---------------------------------------------------------
export async function loadKnowledgeBase() {
  if (knowledgeBasePromise) {
    return knowledgeBasePromise;
  }

  knowledgeBasePromise = (async () => {
    knowledgeBaseLoaded = false;
    knowledgeBaseError = null;

    try {
      console.log(`[RAG] Loading knowledge base from: ${DOCS_DIR}`);

      const files = fs
        .readdirSync(DOCS_DIR)
        .filter((f) => f.match(/\.(pdf|docx|doc)$/i));

      if (files.length === 0) {
        knowledgeBaseError = new Error("No documents found for RAG.");
        console.warn("⚠️ No documents found for RAG.");
        return;
      }

      const allDocs = [];

      for (const file of files) {
        const filePath = path.join(DOCS_DIR, file);
        let text = "";

        // PDF support (disabled)
        // if (file.endsWith(".pdf")) {
        //   const buffer = fs.readFileSync(filePath);
        //   const data = await pdf(buffer);
        //   text = data.text || "";
        // } else {
        const result = await mammoth.extractRawText({ path: filePath });
        text = result.value || "";
        // }

        const docs = await textSplitter.createDocuments([text], [
          { source: file },
        ]);

        allDocs.push(...docs);
      }

      console.log(`[RAG] Parsed ${allDocs.length} chunks from ${files.length} files.`);

      const embeddings = new OpenAIEmbeddings({
        model: EMBEDDING_MODEL,
        openAIApiKey: process.env.OPENAI_API_KEY,
      });

      vectorStore = await QdrantVectorStore.fromDocuments(
        allDocs,
        embeddings,
        {
          client: qdrantClient,
          collectionName: QDRANT_COLLECTION,
        }
      );

      knowledgeBaseLoaded = true;
      console.log("🧠 Knowledge Base Loaded!");
    } catch (error) {
      knowledgeBaseError = error;
      console.error("Knowledge base load error:", error);
    } finally {
      // Allow retries if load failed
      if (!knowledgeBaseLoaded) {
        knowledgeBasePromise = null;
      }
    }
  })();

  return knowledgeBasePromise;
}

// ---------------------------------------------------------
// 🧠 MAIN AI RESPONSE LOGIC
// ---------------------------------------------------------
export async function handleUserQuestion(question) {
  const normalized = question.toLowerCase();

  // ---------------------------------------------------------
  // 👋 GREETINGS
  // ---------------------------------------------------------
  if (/^(hi|hello|hey|howdy)/i.test(normalized)) {
    const followUps = await generateFollowUps(question);
    return {
      answer: "Hi! I'm Veda 👋 How can I assist you?",
      followUps,
      source: "greeting",
    };
  }

  // ---------------------------------------------------------
  // ❌ BLOCK IRRELEVANT TOPICS
  // ---------------------------------------------------------
  const containsNotAllowed = notAllowedKeywords.some((kw) =>
    normalized.includes(kw)
  );

  if (containsNotAllowed) {
    return {
      answer:
        "⚠️ I can only answer questions related to Tekisho Infotech, our products and services.",
      followUps: [
        "What services do you offer?",
        "How can Tekisho help with AI?",
        "How do I contact support?",
      ],
      source: "restricted",
    };
  }

  // ---------------------------------------------------------
  // ⏳ KNOWLEDGE BASE LOADING
  // ---------------------------------------------------------
  if (!knowledgeBaseLoaded) {
    // Attempt (or re-attempt) to load the KB on-demand
    await loadKnowledgeBase();

    if (!knowledgeBaseLoaded) {
      return {
        answer:
          knowledgeBaseError?.message
            ? `⚠️ Knowledge base unavailable: ${knowledgeBaseError.message}`
            : "⏳ Loading company knowledge... try again shortly.",
        followUps: [],
        source: "loading",
      };
    }
  }

  // ---------------------------------------------------------
  // 🔍 RAG RETRIEVAL + ANSWERING
  // ---------------------------------------------------------
  try {
    const retriever = vectorStore.asRetriever({ k: 5 });
    const docs = await retriever.invoke(question);

    const context = docs
      .map((d) => `${d.metadata?.source}:\n${d.pageContent}`)
      .join("\n\n");

    const prompt = `
Use ONLY the following text to answer:

${context}

Question: ${question}
Respond in short and direct sentences.
`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.2,
    });

    const followUps = await generateFollowUps(question);

    return {
      answer: response.choices[0].message.content.trim(),
      followUps,
      source: "knowledge_base",
    };
  } catch (err) {
    console.error("RAG Error:", err);

    return {
      answer: "⚠️ Sorry, I couldn’t find relevant information.",
      followUps: [],
      source: "fallback",
    };
  }
} // <-- CORRECT CLOSING BRACE

// ---------------------------------------------------------
// AUTO-LOAD KNOWLEDGE BASE AT STARTUP
// ---------------------------------------------------------
loadKnowledgeBase();
