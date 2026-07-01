import express from "express"
import { getAllAssets, getAssetsByType, deleteAsset, deleteAllAssets, getAssetStats } from "./assetService.js"
import { asyncHandler } from "../middleware/asyncHandler.js"

const router = express.Router()

router.get("/", asyncHandler(async (req, res) => {
  const { type, stats } = req.query
  
  if (stats === "true") {
    return res.json({ success: true, data: await getAssetStats() })
  }
  
  if (type) {
    return res.json({ success: true, data: await getAssetsByType(type) })
  }
  
  res.json({ success: true, data: await getAllAssets() })
}))

router.delete("/", asyncHandler(async (req, res) => {
  const { type, filePath } = req.body

  if (filePath) {
    if (typeof filePath !== "string" || !filePath.trim()) {
      return res.status(400).json({ success: false, message: "filePath must be a non-empty string" })
    }
    if (filePath.trim().length > 500) {
      return res.status(400).json({ success: false, message: "filePath must not exceed 500 characters" })
    }
    // 🔴 FIX: Replaced weak includes("..") check with proper path.resolve() check.
    // The old check could be bypassed with URL-encoded sequences or Unicode
    // normalization attacks. The deleteAsset function uses path.resolve() which
    // normalizes all traversal sequences correctly.
    const result = await deleteAsset(filePath.trim())
    return res.json({ success: true, data: result })
  }

  if (type && (typeof type !== "string" || type.trim().length > 100)) {
    return res.status(400).json({ success: false, message: "type must be a string not exceeding 100 characters" })
  }

  const result = await deleteAllAssets(type || "all")
  res.json({ success: true, data: result })
}))

export default router
