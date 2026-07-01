import express from "express"
import { getBestNiche, getAllNicheStats, registerVideoPerformance, getNiches, getNicheHealth } from "./nicheService.js"
import { asyncHandler } from "../middleware/asyncHandler.js"

const router = express.Router()

router.get("/", asyncHandler(async (req, res) => {
  const { type } = req.query
  
  switch (type) {
    case "list":
      return res.json({ success: true, data: getNiches() })
    
    case "health":
      return res.json({ success: true, data: await getNicheHealth() })
    
    case "stats":
      return res.json({ success: true, data: getAllNicheStats() })
    
    case "best":
    default:
      const best = await getBestNiche()
      return res.json({ success: true, data: best })
  }
}))

router.post("/", asyncHandler(async (req, res) => {
  const { niche, videoId } = req.body

  if (!niche || typeof niche !== "string" || !niche.trim()) {
    return res.status(400).json({ success: false, message: "niche is required and must be a non-empty string" })
  }
  if (niche.trim().length > 100) {
    return res.status(400).json({ success: false, message: "niche must not exceed 100 characters" })
  }

  if (!videoId || typeof videoId !== "string" || !videoId.trim()) {
    return res.status(400).json({ success: false, message: "videoId is required and must be a non-empty string" })
  }
  if (videoId.trim().length > 50) {
    return res.status(400).json({ success: false, message: "videoId must not exceed 50 characters" })
  }

  await registerVideoPerformance(niche.trim(), videoId.trim())

  res.json({ success: true, message: `Registered video ${videoId} for niche ${niche}` })
}))

export default router
