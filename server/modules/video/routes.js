import express from "express"
import { asyncHandler } from "../../middleware/asyncHandler.js"
import { downloadVideo } from "./controller.js"

const router = express.Router()

const validateDownloadInput = (req, res, next) => {
  const { query, topic } = req.body
  const searchQuery = query || topic || ""
  if (!searchQuery.trim()) {
    return res.status(400).json({ success: false, message: "query or topic is required" })
  }
  req.body.query = searchQuery.trim()
  next()
}

router.post("/download", validateDownloadInput, asyncHandler(downloadVideo))

export default router
