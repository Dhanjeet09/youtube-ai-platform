import express from "express"
import { fetchVideoAnalytics, calculateViralScore, getViralScoreGrade } from "./analyticsService.js"
import { asyncHandler } from "../middleware/asyncHandler.js"
import { log } from "../utils/logger.js"

const router = express.Router()

// In-memory dashboard store (video IDs pinned by user)
const dashboardVideos = []

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

/**
 * POST /api/analytics/dashboard
 * Add a video to the pinned dashboard list.
 */
router.post("/dashboard", asyncHandler(async (req, res) => {
  const { videoId } = req.body

  if (!videoId || typeof videoId !== "string" || !videoId.trim()) {
    return res.status(400).json({
      success: false,
      message: "videoId is required and must be a non-empty string"
    })
  }

  const sanitizedVideoId = videoId.trim()

  // Avoid duplicates
  if (dashboardVideos.includes(sanitizedVideoId)) {
    return res.json({
      success: true,
      data: {
        message: "Video already on dashboard",
        dashboardVideos: [...dashboardVideos]
      }
    })
  }

  // Cap at 20 pinned videos
  if (dashboardVideos.length >= 20) {
    dashboardVideos.shift()
  }

  dashboardVideos.push(sanitizedVideoId)
  log("INFO", "Video added to dashboard", { videoId: sanitizedVideoId })

  res.json({
    success: true,
    data: {
      message: "Video added to dashboard",
      dashboardVideos: [...dashboardVideos]
    }
  })
}))

export default router
