import express from "express"
import { getStatus, toggle } from "../scheduler/schedulerService.js"
import { asyncHandler } from "../middleware/asyncHandler.js"

const router = express.Router()

router.get("/status", asyncHandler(async (req, res) => {
  const status = getStatus()

  res.json({
    success: true,
    data: status
  })
}))

router.post("/toggle", asyncHandler(async (req, res) => {
  const status = toggle()

  res.json({
    success: true,
    data: status,
    message: status.enabled
      ? "Scheduler enabled — videos will be created on schedule"
      : "Scheduler disabled — no automatic video creation"
  })
}))

export default router
