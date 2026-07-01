import { generateScript, getContentTypes, getAgeGroups } from "./service.js"

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
 */
export const createScript = async (req, res, next) => {
  try {
    const { topic, contentType, ageGroup, style, hook, maxWords, temperature, niche, language, videoType } = req.body

    if (!topic) {
      return res.status(400).json({ success: false, message: "topic is required" })
    }

    const script = await generateScript(topic, { contentType, ageGroup, style, hook, maxWords, temperature, niche, language, videoType })
    res.json({ success: true, data: { script, contentType, ageGroup } })
  } catch (error) {
    next(error)
  }
}
