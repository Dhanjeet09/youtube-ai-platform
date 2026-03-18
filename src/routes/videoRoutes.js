import express from "express"
import { fetchStockVideo } from "../controllers/videoController.js"

const router = express.Router()

router.post("/stock", fetchStockVideo)

export default router