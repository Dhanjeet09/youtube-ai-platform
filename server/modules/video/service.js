import axios from "axios"
import fs from "fs"
import path from "path"
import crypto from "crypto"
import { log as logger } from "../../utils/logger.js"
import { isImageKitConfigured } from "../../config/imagekit.js"
import { uploadFile as ikUpload, getBucketPath } from "../../services/imagekitService.js"

const log = (level, message, data = {}) => logger(level, `[VIDEO] ${message}`, data)

const videoCache = new Map()
const VIDEO_CACHE_TTL_MS = 60 * 60 * 1000
const VIDEO_CACHE_MAX_SIZE = 500

// Store interval reference for cleanup on shutdown
let _cacheCleanupInterval = null

// Periodic cleanup of stale video cache entries
_cacheCleanupInterval = setInterval(() => {
  const now = Date.now()
  let staleCount = 0
  for (const [key, entry] of videoCache) {
    if (now - entry.timestamp > VIDEO_CACHE_TTL_MS) {
      videoCache.delete(key)
      staleCount++
    }
  }
  if (videoCache.size > VIDEO_CACHE_MAX_SIZE) {
    const entries = [...videoCache.entries()]
      .sort((a, b) => a[1].timestamp - b[1].timestamp)
    const toDelete = entries.slice(0, entries.length - VIDEO_CACHE_MAX_SIZE)
    for (const [key] of toDelete) {
      videoCache.delete(key)
    }
    log("INFO", "Video cache cleanup", { staleRemoved: staleCount, overMaxRemoved: toDelete.length, size: videoCache.size })
  } else if (staleCount > 0) {
    log("INFO", "Video cache stale entries cleaned", { removed: staleCount, size: videoCache.size })
  }
}, 30 * 60 * 1000)

const selectBestVideo = (videos) => {
  const validVideos = videos.filter(v => 
    v.video_files && 
    v.video_files.length > 0 &&
    v.image
  )

  if (validVideos.length === 0) {
    throw new Error("No valid videos found")
  }

  const shuffled = validVideos.sort(() => Math.random() - 0.5)
  const selected = shuffled[0]

  // BUG FIX #9: Changed from const to let because this variable is reassigned below
  let sortedFiles = [...selected.video_files]
    .filter(f => f.link && f.height >= 720)
    .sort((a, b) => (b.height * b.width) - (a.height * a.width))

  if (sortedFiles.length === 0) {
    sortedFiles = [...selected.video_files].filter(f => f.link).sort((a, b) => (b.height * b.width) - (a.height * a.width))
  }

  return {
    url: sortedFiles[0]?.link,
    thumbnail: selected.image,
    duration: selected.duration,
    photographer: selected.user?.name || "Unknown"
  }
}

export const downloadStockVideo = async (query, options = {}) => {
  const { outputDir = "assets/generated/videos", perPage = 15 } = options

  if (!query || query.trim().length === 0) {
    throw new Error("Query is required")
  }

  const cacheKey = query.toLowerCase().trim()
  const cached = videoCache.get(cacheKey)
  if (cached && Date.now() - cached.timestamp < 3600000) {
    log("INFO", "Using cached video", { query })
    return cached.path
  }

  try {
    log("INFO", "Searching stock video", { query })

    const response = await axios.get(
      "https://api.pexels.com/videos/search",
      {
        headers: {
          Authorization: process.env.PEXELS_API_KEY,
        },
        params: {
          query,
          per_page: perPage,
          orientation: "portrait"
        },
        timeout: 15000
      }
    )

    const videos = response.data.videos

    if (!videos || !Array.isArray(videos) || videos.length === 0) {
      throw new Error(`No videos found for: ${query}`)
    }

    const selected = selectBestVideo(videos)

    if (!selected.url) {
      throw new Error("No downloadable video found")
    }

    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true })
    }

    const filename = `stock_${Date.now()}_${crypto.randomUUID().slice(0, 8)}.mp4`
    const outputPath = path.join(outputDir, filename)

    // 🔴 FIX: Removed URL from log — could leak CDN URLs with tokens.
    // The last 50 chars of a CDN URL could contain query parameters, signatures,
    // or session tokens. Log only safe metadata.
    log("INFO", "Downloading video", { 
      duration: selected.duration,
      photographer: selected.photographer,
      fileSize: selected.video_files?.[0]?.width ? `${selected.video_files[0].width}x${selected.video_files[0].height}` : "unknown"
    })

    const videoStream = await axios({
      url: selected.url,
      method: "GET",
      responseType: "stream",
      timeout: 120000
    })

    // 🔴 FIX: Enforce max download size (500MB) to prevent disk exhaustion
    // from a malicious or compromised Pexels API response.
    const MAX_DOWNLOAD_SIZE = 500 * 1024 * 1024 // 500MB
    let downloadedBytes = 0

    const writer = fs.createWriteStream(outputPath)

    await new Promise((resolve, reject) => {
      videoStream.data.on("data", (chunk) => {
        downloadedBytes += chunk.length
        if (downloadedBytes > MAX_DOWNLOAD_SIZE) {
          writer.destroy(new Error("Download exceeded maximum allowed size (500MB)"))
          videoStream.data.destroy()
          // Clean up the partial file
          try { if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath) } catch { /* ignore */ }
        }
      })
      videoStream.data.pipe(writer)
      writer.on("finish", resolve)
      writer.on("error", (err) => {
        // Clean up partial file on error
        try { if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath) } catch { /* ignore */ }
        reject(err)
      })
    })

    const fileSize = (fs.statSync(outputPath).size / 1024 / 1024).toFixed(2)
    const fileName = path.basename(outputPath)
    // 🔴 FIX: Log only basename, not full path
    log("INFO", "Video downloaded", { filename: fileName, size: `${fileSize}MB` })

    // Upload to ImageKit if configured (as side effect — pipeline still needs local file for FFmpeg)
    let imageKitUrl = null
    if (isImageKitConfigured()) {
      try {
        const { folder } = getBucketPath("videos", fileName)
        const result = await ikUpload(outputPath, fileName, folder)
        if (result) {
          log("INFO", "Video uploaded to ImageKit", { url: result.url, local: outputPath })
          imageKitUrl = result.url
        }
      } catch (ikError) {
        log("WARN", "Failed to upload video to ImageKit", { error: ikError.message })
      }
    }

    videoCache.set(cacheKey, { path: outputPath, imageKitUrl, timestamp: Date.now() })

    // Return object with local path and ImageKit URL
    return { path: outputPath, imageKitUrl }

  } catch (error) {
    log("ERROR", "Download failed", { query, error: error.message })
    throw new Error(`Video download failed: ${error.message}`)
  }
}

export const clearVideoCache = () => {
  videoCache.clear()
  log("INFO", "Video cache cleared")
}

export const cleanupVideoCache = () => {
  if (_cacheCleanupInterval) {
    clearInterval(_cacheCleanupInterval)
    _cacheCleanupInterval = null
  }
  videoCache.clear()
  log("INFO", "Video cache system cleaned up")
}
