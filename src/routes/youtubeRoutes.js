import express from "express"
import {
  youtubeAuth,
  youtubeCallback,
  getAuthUrl,
  getAuthStatus,
  uploadVideo
} from "../controllers/youtubeController.js"

const router = express.Router()

router.get("/auth-url", getAuthUrl)
router.get("/status", getAuthStatus)
router.get("/auth", youtubeAuth)
router.get("/callback", youtubeCallback)
router.post("/upload", uploadVideo)

export default router