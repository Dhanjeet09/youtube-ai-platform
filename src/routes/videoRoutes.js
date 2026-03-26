import express from "express"
import { downloadStockVideo } from "../services/videoService.js"

const router = express.Router()

router.post("/download", async (req, res, next) => {
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
})

export default router
