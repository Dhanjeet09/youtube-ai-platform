import { downloadStockVideo } from "./service.js"

/**
 * POST /api/video/download
 * Downloads a stock video from Pexels based on a search query.
 */
export const downloadVideo = async (req, res, next) => {
  try {
    const { query } = req.body
    if (!query) {
      return res.status(400).json({ success: false, message: "query is required" })
    }
    const videoPath = await downloadStockVideo(query)
    res.json({ success: true, data: { videoPath } })
  } catch (error) {
    next(error)
  }
}
