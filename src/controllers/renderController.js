import { renderVideo } from "../services/renderService.js"

export const createFinalVideo = async (req, res, next) => {
  try {

    const { audio, video } = req.body

    const finalVideo = await renderVideo(audio, video)

    res.json({
      success: true,
      file: finalVideo
    })

  } catch (error) {
    next(error)
  }
}