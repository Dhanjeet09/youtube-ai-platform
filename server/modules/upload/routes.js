import express from "express"
import { asyncHandler } from "../../middleware/asyncHandler.js"
import { youtubeLimiter, youtubeReadLimiter } from "../../middleware/rateLimiter.js"
import {
  youtubeAuth,
  youtubeCallback,
  getAuthUrl,
  getAuthStatus,
  uploadVideo
} from "./controller.js"

const router = express.Router()

// Read-only endpoints — generous limit
router.get("/auth-url", youtubeReadLimiter, asyncHandler(getAuthUrl))
router.get("/status", youtubeReadLimiter, asyncHandler(getAuthStatus))
router.get("/auth", youtubeReadLimiter, asyncHandler(youtubeAuth))

// Callback — auth-specific limit
router.get("/callback", asyncHandler(youtubeCallback))

// Upload — strict limit
router.post("/upload", youtubeLimiter, asyncHandler(uploadVideo))

export default router
