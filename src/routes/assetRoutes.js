import express from "express"
import { getAllAssets, getAssetsByType, deleteAsset, deleteAllAssets, getAssetStats } from "../services/assetService.js"

const router = express.Router()

router.get("/", (req, res, next) => {
  try {
    const { type, stats } = req.query
    
    if (stats === "true") {
      return res.json({ success: true, data: getAssetStats() })
    }
    
    if (type) {
      return res.json({ success: true, data: getAssetsByType(type) })
    }
    
    res.json({ success: true, data: getAllAssets() })
  } catch (error) {
    next(error)
  }
})

router.delete("/", (req, res, next) => {
  try {
    const { type, filePath } = req.body
    
    if (filePath) {
      const result = deleteAsset(filePath)
      return res.json({ success: true, data: result })
    }
    
    const result = deleteAllAssets(type || "all")
    res.json({ success: true, data: result })
  } catch (error) {
    next(error)
  }
})

export default router
