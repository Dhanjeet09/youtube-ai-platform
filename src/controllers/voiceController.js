import { generateVoice } from "../services/voiceService.js";

export const generateVoiceFromText = async (req, res, next) => {
  try {
    const { text } = req.body;

    if (!text) {
      return res.status(400).json({
        success: false,
        message: "Text is required",
      });
    }

    const voicePath = await generateVoice(text);

    res.json({
      success: true,
      file: voicePath,
    });
  } catch (error) {
    next(error);
  }
};
