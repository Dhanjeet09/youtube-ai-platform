import express from "express"
import {
  youtubeAuth,
  youtubeCallback,
    uploadVideo
} from "../controllers/youtubeController.js"

const router = express.Router()

router.get("/auth", youtubeAuth)
router.get("/callback", youtubeCallback)
router.post("/upload", uploadVideo)

export default router