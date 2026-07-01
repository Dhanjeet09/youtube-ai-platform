import express from "express"
import { getHighRpmNiches, getEstimatedEarnings } from "./monetizationService.js"
import { getEarningsReport, trackVideoEarnings } from "./earningsService.js"
import { generateAffiliateCTA } from "../seo/affiliateService.js"
import { asyncHandler } from "../middleware/asyncHandler.js"

const router = express.Router()

router.get("/", asyncHandler(async (req, res) => {
  const { type, niche, views } = req.query
  
  switch (type) {
    case "niches":
      return res.json({ success: true, data: getHighRpmNiches() })
    
    case "report":
      return res.json({ success: true, data: await getEarningsReport() })
    
    case "earnings":
      if (!niche || typeof niche !== "string" || !niche.trim()) {
        return res.status(400).json({ success: false, message: "niche is required and must be a non-empty string" })
      }
      if (niche.trim().length > 100) {
        return res.status(400).json({ success: false, message: "niche must not exceed 100 characters" })
      }
      return res.json({ 
        success: true, 
        data: getEstimatedEarnings(parseInt(views) || 100000, niche.trim()) 
      })
    
    case "cta":
      if (!niche || typeof niche !== "string" || !niche.trim()) {
        return res.status(400).json({ success: false, message: "niche is required and must be a non-empty string" })
      }
      if (niche.trim().length > 100) {
        return res.status(400).json({ success: false, message: "niche must not exceed 100 characters" })
      }
      return res.json({ success: true, data: generateAffiliateCTA(niche.trim()) })
    
    default:
      return res.json({ success: true, data: getHighRpmNiches() })
  }
}))

router.post("/", asyncHandler(async (req, res) => {
  const { videoId, niche, views } = req.body

  if (!videoId || typeof videoId !== "string" || !videoId.trim()) {
    return res.status(400).json({ success: false, message: "videoId is required and must be a non-empty string" })
  }
  if (videoId.trim().length > 50) {
    return res.status(400).json({ success: false, message: "videoId must not exceed 50 characters" })
  }

  if (!niche || typeof niche !== "string" || !niche.trim()) {
    return res.status(400).json({ success: false, message: "niche is required and must be a non-empty string" })
  }
  if (niche.trim().length > 100) {
    return res.status(400).json({ success: false, message: "niche must not exceed 100 characters" })
  }

  const result = await trackVideoEarnings(videoId.trim(), niche.trim(), parseInt(views) || 0)
  res.json({ success: true, data: result })
}))

export default router
