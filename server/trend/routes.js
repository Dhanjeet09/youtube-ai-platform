import express from "express"
import { getTrends, getAvailableNiches } from "./trendService.js"
import { asyncHandler } from "../middleware/asyncHandler.js"

const router = express.Router()

router.get("/", asyncHandler(async (req, res) => {
  const { niche, type } = req.query

  if (type && (typeof type !== "string" || type.trim().length > 50)) {
    return res.status(400).json({ success: false, message: "Invalid type parameter" })
  }

  if (type === "list") {
    return res.json({ success: true, data: getAvailableNiches() })
  }

  if (niche !== undefined && (typeof niche !== "string" || niche.trim().length > 100)) {
    return res.status(400).json({ success: false, message: "niche must be a string not exceeding 100 characters" })
  }

  const trends = await getTrends({ niche: niche?.trim(), limit: 15 })
  res.json({ success: true, data: trends })
}))

export default router
