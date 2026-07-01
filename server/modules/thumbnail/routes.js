/**
 * Thumbnail generation routes.
 *
 * Security hardening:
 *  - Input validation on videoPath (string check + length limit)
 *  - Count parameter is bounded (1-10)
 *  - No path traversal is possible (enforced by service layer)
 */

import express from "express"
import { asyncHandler } from "../../middleware/asyncHandler.js"
import {
  generateThumbnail,
  generateThumbnails,
  getThumbnailTemplates,
} from "./service.js"

const router = express.Router()

/**
 * POST /api/thumbnail/generate
 * Generate a single thumbnail from a video at a specific timestamp.
 */
router.post(
  "/generate",
  asyncHandler(async (req, res) => {
    const { videoPath, timestamp } = req.body

    if (!videoPath || typeof videoPath !== "string" || videoPath.length > 500) {
      return res
        .status(400)
        .json({ success: false, message: "videoPath is required and must be a valid path" })
    }

    if (timestamp && (typeof timestamp !== "string" || timestamp.length > 20)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid timestamp parameter" })
    }

    const thumbPath = await generateThumbnail(videoPath, { timestamp })
    res.json({ success: true, data: { thumbPath } })
  })
)

/**
 * POST /api/thumbnail/generate-multiple
 * Generate multiple thumbnails from a video.
 */
router.post(
  "/generate-multiple",
  asyncHandler(async (req, res) => {
    const { videoPath, count } = req.body

    if (!videoPath || typeof videoPath !== "string" || videoPath.length > 500) {
      return res
        .status(400)
        .json({ success: false, message: "videoPath is required and must be a valid path" })
    }

    // Bounded integer
    const safeCount =
      typeof count === "number" && Number.isInteger(count)
        ? Math.min(Math.max(count, 1), 10)
        : 3

    const thumbs = await generateThumbnails(videoPath, safeCount)
    res.json({ success: true, data: { thumbs } })
  })
)

/**
 * GET /api/thumbnail/templates
 * Get available thumbnail templates.
 */
router.get("/templates", asyncHandler(async (req, res) => {
  const templates = getThumbnailTemplates()
  res.json({ success: true, data: templates })
}))

export default router
