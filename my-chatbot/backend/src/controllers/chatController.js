import express from "express";
import { handleUserQuestion } from "../services/ragService.js";
import { saveContact } from "../repositories/supabaseRepo.js";
import { detectContactIntent, extractContactDetails } from "../services/intentService.js";

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Chat
 *   description: Chatbot interaction APIs
 */

/**
 * @swagger
 * /ask:
 *   post:
 *     summary: Ask chatbot a question
 *     tags: [Chat]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - question
 *             properties:
 *               question:
 *                 type: string
 *     responses:
 *       200:
 *         description: Chatbot response with follow-ups
 */
router.post("/", async (req, res) => {
  try {
    const { question } = req.body;
    if (!question) return res.status(400).json({ error: "Question required" });

    if (detectContactIntent(question)) {
      const { name, phone, email } = extractContactDetails(question);

      if (!phone || !email) {
        return res.json({
          answer: "Please share your name, phone number, and email so our team can contact you.",
        });
      }

      await saveContact({ name, phone, email });

      return res.json({
        answer: `Thanks ${name}! Our team will contact you soon at ${email}.`,
      });
    }

    const result = await handleUserQuestion(question);
    res.json(result);
  } catch (error) {
    console.error("❌ Chat Error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
