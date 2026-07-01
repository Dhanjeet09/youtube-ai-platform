import express from "express"
import { asyncHandler } from "../../middleware/asyncHandler.js"
import { generateVoiceFromText } from "./controller.js"

const router = express.Router()

const validateVoiceInput = (req, res, next) => {
  const { text, script } = req.body
  const rawText = text || script
  if (!rawText || typeof rawText !== 'string') {
    return res.status(400).json({ success: false, message: 'text or script field is required and must be a string' })
  }
  const trimmedText = rawText.trim()
  if (trimmedText.length === 0 || trimmedText.length > 2000) {
    return res.status(400).json({ success: false, message: 'Text must be between 1 and 2000 characters' })
  }
  req.body.text = trimmedText
  next()
}

router.post("/generate", validateVoiceInput, asyncHandler(generateVoiceFromText))

export default router
