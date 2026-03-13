import { downloadStockVideo } from "../services/videoService.js"

export const fetchStockVideo = async (req, res, next) => {
  try {

    const { topic } = req.body

    const videoPath = await downloadStockVideo(topic)

    res.json({
      success: true,
      video: videoPath
    })

  } catch (error) {
    next(error)
  }
}