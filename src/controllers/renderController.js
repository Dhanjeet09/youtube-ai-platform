import { renderVideo } from "../services/renderService.js"

export const createFinalVideo = async (req, res, next) => {
  try {

    const { audio, video, script } = req.body

    // Validate all required fields
    if (!audio || !video) {
      return res.status(400).json({
        success: false,
        error: "Both 'audio' and 'video' file paths are required"
      })
    }

    if (!script) {
      return res.status(400).json({
        success: false,
        error: "'script' text is required for subtitle generation"
      })
    }

    const finalVideo = await renderVideo(audio, video, script)

    res.json({
      success: true,
      file: finalVideo
    })

  } catch (error) {
    next(error)
  }
}