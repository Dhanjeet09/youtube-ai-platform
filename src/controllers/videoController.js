import { downloadStockVideo } from "../services/videoService.js"

export const fetchStockVideo = async (req, res, next) => {
  try {

    const { topic } = req.body

    if (!topic || typeof topic !== 'string' || !topic.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Topic is required'
      })
    }

    const videoPath = await downloadStockVideo(topic)
    res.json({
      success: true,
      video: videoPath
    })

  } catch (error) {
    next(error)
  }
}