import { generateVoice } from "../services/voiceService.js";

export const generateVoiceFromText = async (req, res, next) => {
  try {
    const { text } = req.body;

    if (typeof text !== 'string') {
      return res.status(400).json({
        success: false,
        message: "text must be a string",
      });
    }

    const trimmedText = text.trim();
    if (!trimmedText) {
      return res.status(400).json({
        success: false,
        message: "Text cannot be empty or whitespace only",
      });
    }
    if (trimmedText.length > 2000) {
      return res.status(400).json({
        success: false,
        message: "Text must be 2000 characters or less",
      });
    }

    const voicePath = await generateVoice(trimmedText);

    res.json({
      success: true,
      file: voicePath,
    });
  } catch (error) {
    next(error);
  }
};
