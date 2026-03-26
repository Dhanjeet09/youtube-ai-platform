import express from "express"
import { createVideoPipeline, runFullPipeline } from "../services/pipelineService.js"

const router = express.Router()

router.post("/create", async (req, res, next) => {
  try {
    const { forceNiche } = req.body
    const result = await createVideoPipeline({ forceNiche })

    res.json({
      success: true,
      data: result
    })
  } catch (error) {
    next(error)
  }
})

router.post("/run", async (req, res, next) => {
  try {
    const { forceNiche } = req.body
    const result = await runFullPipeline({ forceNiche })

    res.json({
      success: true,
      data: result
    })
  } catch (error) {
    next(error)
  }
})

export default router
