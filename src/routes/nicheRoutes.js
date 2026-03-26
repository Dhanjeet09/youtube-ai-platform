import express from "express"
import { getBestNiche, getAllNicheStats, registerVideoPerformance, getNiches, getNicheHealth } from "../services/nicheService.js"

const router = express.Router()

router.get("/", async (req, res, next) => {
  try {
    const { type } = req.query
    
    switch (type) {
      case "list":
        return res.json({ success: true, data: getNiches() })
      
      case "health":
        return res.json({ success: true, data: getNicheHealth() })
      
      case "stats":
        return res.json({ success: true, data: getAllNicheStats() })
      
      case "best":
      default:
        const best = await getBestNiche()
        return res.json({ success: true, data: best })
    }
  } catch (error) {
    next(error)
  }
})

router.post("/", async (req, res, next) => {
  try {
    const { niche, videoId } = req.body

    if (!niche || !videoId) {
      return res.status(400).json({ success: false, message: "niche and videoId required" })
    }

    registerVideoPerformance(niche, videoId)

    res.json({ success: true, message: `Registered video ${videoId} for niche ${niche}` })
  } catch (error) {
    next(error)
  }
})

export default router
