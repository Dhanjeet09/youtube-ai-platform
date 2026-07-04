import express from "express"
import { getStatus, toggle } from "../scheduler/schedulerService.js"
import { asyncHandler } from "../middleware/asyncHandler.js"

const router = express.Router()

/**
 * GET /api/scheduler/slots
 * Returns structured time slots for the scheduler display.
 */
router.get("/slots", asyncHandler(async (req, res) => {
  res.json({
    success: true,
    data: {
      slots: [
        { time: '10:00 AM', label: 'Morning', icon: 'wb_sunny', color: 'text-yellow-400', enabled: true },
        { time: '2:00 PM', label: 'Afternoon', icon: 'wb_cloudy', color: 'text-orange-400', enabled: true },
        { time: '6:00 PM', label: 'Evening', icon: 'dark_mode', color: 'text-blue-400', enabled: true }
      ],
      timezone: 'Asia/Kolkata (IST)',
      timezoneShort: 'IST'
    }
  })
}))

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
