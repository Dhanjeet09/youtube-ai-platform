import express from "express"
import { generateFullVideo } from "../controllers/pipelineController.js"

const router = express.Router()

router.post("/create", generateFullVideo)

export default router