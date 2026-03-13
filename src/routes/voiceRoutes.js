import express from "express";
import { generateVoiceFromText } from "../controllers/voiceController.js";

const router = express.Router();

router.post("/generate", generateVoiceFromText);

export default router;
