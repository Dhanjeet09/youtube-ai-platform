import express from "express";
import { generateVoiceFromText } from "../controllers/voiceController.js";

const router = express.Router();

const validateVoiceInput = (req, res, next) => {
  const { text } = req.body;
  if (!text || typeof text !== 'string') {
    return res.status(400).json({ error: 'Text field is required and must be a string' });
  }
  const trimmedText = text.trim();
  if (trimmedText.length === 0 || trimmedText.length > 2000) {
    return res.status(400).json({ error: 'Text must be between 1 and 2000 characters' });
  }
  req.body.text = trimmedText;
  next();
};

router.post("/generate", validateVoiceInput, generateVoiceFromText);

export default router;
