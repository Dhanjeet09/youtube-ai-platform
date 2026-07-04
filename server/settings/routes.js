import express from "express"
import { asyncHandler } from "../middleware/asyncHandler.js"
import { log } from "../utils/logger.js"
import path from "path"
import { readdir as fsReaddir, rm as fsRm, stat as fsStat } from "fs/promises"
import { fileURLToPath } from "url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const router = express.Router()

/**
 * GET /api/settings/version
 * Returns application version and metadata.
 */
router.get("/version", asyncHandler(async (req, res) => {
  res.json({
    success: true,
    data: {
      version: '1.0.0',
      name: 'AutoTube AI',
      description: 'AI-Powered YouTube Automation Platform'
    }
  })
}))

/**
 * GET /api/settings/api-key
 * Returns masked API key info and usage stats.
 */
router.get("/api-key", asyncHandler(async (req, res) => {
  const apiKey = process.env.API_KEY || ""
  const masked = apiKey
    ? `${apiKey.slice(0, 4)}${"*".repeat(Math.max(0, apiKey.length - 8))}${apiKey.slice(-4)}`
    : "Not configured"

  res.json({
    success: true,
    data: {
      key: masked,
      configured: !!apiKey,
      isValid: apiKey.length >= 20
    }
  })
}))

/**
 * POST /api/settings/clear-cache
 * Clears cached data (niche cache, temp files, etc.).
 */
router.post("/clear-cache", asyncHandler(async (req, res) => {
  const storagePath = process.env.STORAGE_PATH || path.join(__dirname, "..", "..", "storage")
  const tempDir = path.join(storagePath, "temp")
  let filesRemoved = 0

  try {
    // Remove temp files
    const entries = await fsReaddir(tempDir).catch(() => [])
    for (const entry of entries) {
      const entryPath = path.join(tempDir, entry)
      const stat = await fsStat(entryPath).catch(() => null)
      if (stat && stat.isFile()) {
        await fsRm(entryPath)
        filesRemoved++
      }
    }
  } catch {
    // Temp directory may not exist — that's fine
  }

  log("INFO", "Cache cleared by user", { filesRemoved })

  res.json({
    success: true,
    data: {
      message: "Cache cleared successfully",
      filesRemoved
    }
  })
}))

/**
 * POST /api/settings/delete-account
 * Placeholder for account deletion. In production, this would
 * anonymize user data and schedule cleanup.
 */
router.post("/delete-account", asyncHandler(async (req, res) => {
  // In a multi-user system, this would:
  // 1. Verify user identity
  // 2. Anonymize personal data
  // 3. Schedule data deletion
  // 4. Revoke all API keys

  log("WARN", "Account deletion requested — not implemented for single-user system")

  res.json({
    success: true,
    data: {
      message: "Account deletion is not applicable in single-user mode. All data is managed locally.",
      action: "none"
    }
  })
}))

export default router
