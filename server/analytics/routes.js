import express from "express"
import { fetchVideoAnalytics, calculateViralScore, getViralScoreGrade } from "./analyticsService.js"
import { asyncHandler } from "../middleware/asyncHandler.js"

const router = express.Router()

router.get("/", asyncHandler(async (req, res) => {
  const { videoId } = req.query

  if (!videoId || typeof videoId !== "string" || !videoId.trim()) {
    return res.status(400).json({
      success: false,
      message: "videoId is required and must be a non-empty string"
    })
  }
  if (videoId.trim().length > 50) {
    return res.status(400).json({
      success: false,
      message: "videoId must not exceed 50 characters"
    })
  }

  const sanitizedVideoId = videoId.trim()
  const analytics = await fetchVideoAnalytics(sanitizedVideoId)
  const viralScore = calculateViralScore(analytics)
  const grade = getViralScoreGrade(viralScore)

  res.json({
    success: true,
    data: {
      videoId: sanitizedVideoId,
      ...analytics,
      viralScore,
      grade
    }
  })
}))

export default router
