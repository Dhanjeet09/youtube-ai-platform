import express from "express"
import { asyncHandler } from "../../middleware/asyncHandler.js"
import { getTopics } from "./controller.js"

const router = express.Router()

router.get("/", asyncHandler(getTopics))

export default router
