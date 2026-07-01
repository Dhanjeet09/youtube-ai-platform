import express from "express"
import { asyncHandler } from "../../middleware/asyncHandler.js"
import {
  youtubeAuth,
  youtubeCallback,
  getAuthUrl,
  getAuthStatus,
  uploadVideo
} from "./controller.js"

const router = express.Router()

router.get("/auth-url", asyncHandler(getAuthUrl))
router.get("/status", asyncHandler(getAuthStatus))
router.get("/auth", asyncHandler(youtubeAuth))
router.get("/callback", asyncHandler(youtubeCallback))
router.post("/upload", asyncHandler(uploadVideo))

export default router
