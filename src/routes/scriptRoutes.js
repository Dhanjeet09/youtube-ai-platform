import express from "express"
import { generateScript, getContentTypes, getAgeGroups } from "../services/scriptService.js"

const router = express.Router()

router.get("/options", (req, res) => {
  res.json({
    success: true,
    data: {
      contentTypes: getContentTypes(),
      ageGroups: getAgeGroups()
    }
  })
})

router.post("/generate", async (req, res, next) => {
  try {
    const { topic, contentType, ageGroup, style, hook, maxWords, temperature, niche } = req.body
    
    if (!topic) {
      return res.status(400).json({ success: false, message: "topic is required" })
    }
    
    const script = await generateScript(topic, { contentType, ageGroup, style, hook, maxWords, temperature, niche })
    res.json({ success: true, data: { script, contentType, ageGroup } })
  } catch (error) {
    next(error)
  }
})

export default router
