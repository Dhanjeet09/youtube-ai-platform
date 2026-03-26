import express from "express"
import { getHighRpmNiches, getEstimatedEarnings } from "../services/monetizationService.js"
import { getEarningsReport, trackVideoEarnings } from "../services/earningsService.js"
import { generateAffiliateCTA } from "../services/affiliateService.js"

const router = express.Router()

router.get("/", async (req, res, next) => {
  try {
    const { type, niche, views } = req.query
    
    switch (type) {
      case "niches":
        return res.json({ success: true, data: getHighRpmNiches() })
      
      case "report":
        return res.json({ success: true, data: getEarningsReport() })
      
      case "earnings":
        if (!niche) {
          return res.status(400).json({ success: false, message: "niche required" })
        }
        return res.json({ 
          success: true, 
          data: getEstimatedEarnings(parseInt(views) || 100000, niche) 
        })
      
      case "cta":
        if (!niche) {
          return res.status(400).json({ success: false, message: "niche required" })
        }
        return res.json({ success: true, data: generateAffiliateCTA(niche) })
      
      default:
        return res.json({ success: true, data: getHighRpmNiches() })
    }
  } catch (error) {
    next(error)
  }
})

router.post("/", async (req, res, next) => {
  try {
    const { videoId, niche, views } = req.body

    if (!videoId || !niche) {
      return res.status(400).json({ success: false, message: "videoId and niche required" })
    }

    const result = trackVideoEarnings(videoId, niche, parseInt(views) || 0)
    res.json({ success: true, data: result })
  } catch (error) {
    next(error)
  }
})

export default router
