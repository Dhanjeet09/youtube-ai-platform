import express from "express"
import { generateScriptFromTrend } from "../controllers/trendController.js"

const router = express.Router()

router.get("/generate-script", generateScriptFromTrend)

export default router