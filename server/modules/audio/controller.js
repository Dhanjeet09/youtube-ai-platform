import { generateVoice } from "./service.js"

/**
 * POST /api/voice/generate
 * Generates voice audio from text using Google TTS.
 */
export const generateVoiceFromText = async (req, res, next) => {
  try {
    const { script: textFromScript, text: textFromText, language } = req.body
    const text = textFromText || textFromScript

    if (typeof text !== 'string') {
      return res.status(400).json({
        success: false,
        message: "text or script field must be a string",
      })
    }

    const trimmedText = text.trim()
    if (!trimmedText) {
      return res.status(400).json({
        success: false,
        message: "Text cannot be empty or whitespace only",
      })
    }
    if (trimmedText.length > 2000) {
      return res.status(400).json({
        success: false,
        message: "Text must be 2000 characters or less",
      })
    }

    const result = await generateVoice(trimmedText, { language })
    const voicePath = typeof result === 'string' ? result : result.path

    res.json({
      success: true,
      data: { file: voicePath },
    })
  } catch (error) {
    next(error)
  }
}
