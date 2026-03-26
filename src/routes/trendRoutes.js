import express from "express"
import { getTrends, getAvailableNiches } from "../services/trendService.js"

const router = express.Router()

router.get("/", async (req, res, next) => {
  try {
    const { niche, type } = req.query
    
    if (type === "list") {
      return res.json({ success: true, data: getAvailableNiches() })
    }
    
    const trends = await getTrends({ niche, limit: 15 })
    res.json({ success: true, data: trends })
  } catch (error) {
    next(error)
  }
})

export default router
