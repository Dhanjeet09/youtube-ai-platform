import express from "express"
import { createFinalVideo } from "../controllers/renderController.js"

const router = express.Router()

router.post("/final", createFinalVideo)

export default router