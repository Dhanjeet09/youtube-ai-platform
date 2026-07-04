import { generateScript, getContentTypes, getAgeGroups } from "./service.js"
import Script from "../../database/models/Script.js"
import { log as logger } from "../../utils/logger.js"

/**
 * GET /api/script/options
 * Returns available content types and age groups for script generation.
 */
export const getScriptOptions = async (req, res, next) => {
  try {
    res.json({
      success: true,
      data: {
        contentTypes: getContentTypes(),
        ageGroups: getAgeGroups()
      }
    })
  } catch (error) {
    next(error)
  }
}

/**
 * POST /api/script/generate
 * Generates a script using the Groq AI API based on the provided options.
 * Saves the generated script to the database for history tracking.
 */
export const createScript = async (req, res, next) => {
  try {
    const { topic, contentType, ageGroup, style, hook, maxWords, temperature, niche, language, videoType } = req.body

    if (!topic) {
      return res.status(400).json({ success: false, message: "topic is required" })
    }

    const script = await generateScript(topic, { contentType, ageGroup, style, hook, maxWords, temperature, niche, language, videoType })

    // Save to script history (best-effort, don't fail the request if save fails)
    try {
      await Script.create({
        topic: topic.trim(),
        content: script,
        source: contentType || "script"
      })
    } catch (saveErr) {
      logger("WARN", "Failed to save script to history", { error: saveErr.message })
    }

    res.json({ success: true, data: { script, contentType, ageGroup } })
  } catch (error) {
    next(error)
  }
}
