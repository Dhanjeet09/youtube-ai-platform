import express from "express"
import { renderVideo } from "../services/renderService.js"

const router = express.Router()

router.post("/video", async (req, res, next) => {
  try {
    const { audioPath, videoPath, script, quality } = req.body
    
    if (!audioPath || !videoPath || !script) {
      return res.status(400).json({ 
        success: false, 
        message: "audioPath, videoPath and script are required" 
      })
    }
    
    const resultPath = await renderVideo(audioPath, videoPath, script, { quality })
    res.json({ success: true, data: { videoPath: resultPath } })
  } catch (error) {
    next(error)
  }
})

export default router
