import express from "express"
import { asyncHandler } from "../../middleware/asyncHandler.js"
import { getScriptOptions, createScript } from "./controller.js"

const router = express.Router()

router.get("/options", asyncHandler(getScriptOptions))

/**
 * GET /api/script/languages
 * Returns list of supported languages for script generation.
 */
router.get("/languages", asyncHandler(async (req, res) => {
  res.json({
    success: true,
    data: {
      languages: [
        { code: 'en', name: 'English' },
        { code: 'hinglish', name: 'Hinglish' },
        { code: 'hi', name: 'Hindi' },
        { code: 'es', name: 'Spanish' },
        { code: 'fr', name: 'French' },
        { code: 'de', name: 'German' },
        { code: 'pt', name: 'Portuguese' },
        { code: 'ja', name: 'Japanese' },
        { code: 'ko', name: 'Korean' },
        { code: 'ar', name: 'Arabic' }
      ]
    }
  })
}))

/**
 * GET /api/script/config
 * Returns script generation configuration (content types, age groups, video types, word limits).
 */
router.get("/config", asyncHandler(async (req, res) => {
  const { getContentTypes, getAgeGroups } = await import("./service.js")

  res.json({
    success: true,
    data: {
      contentTypes: getContentTypes(),
      ageGroups: getAgeGroups(),
      videoTypes: [
        { value: 'long', label: 'Long Form', icon: 'smart_display' },
        { value: 'short', label: 'Short', icon: 'smartphone' }
      ],
      defaultMaxWords: 200,
      minWords: 50,
      maxWords: 500,
      wordStep: 25
    }
  })
}))

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
