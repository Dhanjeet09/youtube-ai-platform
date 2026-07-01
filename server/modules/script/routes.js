import express from "express"
import { asyncHandler } from "../../middleware/asyncHandler.js"
import { getScriptOptions, createScript } from "./controller.js"

const router = express.Router()

router.get("/options", asyncHandler(getScriptOptions))

const validateScriptInput = (req, res, next) => {
  const { topic, contentType, ageGroup, maxWords } = req.body

  if (!topic || typeof topic !== 'string' || !topic.trim()) {
    return res.status(400).json({ success: false, message: "topic is required and must be a non-empty string" })
  }
  if (contentType && typeof contentType !== 'string') {
    return res.status(400).json({ success: false, message: "contentType must be a string" })
  }
  if (ageGroup && typeof ageGroup !== 'string') {
    return res.status(400).json({ success: false, message: "ageGroup must be a string" })
  }
  if (maxWords !== undefined && (typeof maxWords !== 'number' || maxWords < 10 || maxWords > 3000)) {
    return res.status(400).json({ success: false, message: "maxWords must be a number between 10 and 3000" })
  }

  req.body.topic = req.body.topic.trim()
  next()
}

router.post("/generate", validateScriptInput, asyncHandler(createScript))

export default router
