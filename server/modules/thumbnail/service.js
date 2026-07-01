/**
 * Thumbnail generation service.
 *
 * Security hardening:
 *  - Path traversal protection on `videoPath` input
 *  - Allowed directories are whitelisted (assets/generated)
 *  - Input validation on timestamp format
 */

import fs from "fs"
import path from "path"
import { spawn } from "child_process"
import { fileURLToPath } from "url"
import { log as logger } from "../../utils/logger.js"
import { isR2Configured } from "../../config/r2.js"
import { uploadFile, getBucketPath } from "../../services/r2Service.js"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

/**
 * Resolve a relative project path to an absolute path based on project root.
 */
const resolveProjectPath = (relativePath) => {
  if (path.isAbsolute(relativePath)) return relativePath
  return path.resolve(__dirname, "..", "..", relativePath)
}

const log = (level, message, data = {}) => logger(level, `[THUMBNAIL] ${message}`, data)

/**
 * Allowed base directories for video paths.
 * Prevents path-traversal attacks that could read arbitrary files with ffmpeg.
 */
const ALLOWED_VIDEO_DIRS = [
  resolveProjectPath("assets/generated"),
  resolveProjectPath("storage"),
  resolveProjectPath("assets/generated/videos"),
  resolveProjectPath("assets/generated/final-videos"),
].map((p) => p.replace(/\\/g, "/"))

/**
 * Validate that a file path is within one of the allowed directories.
 * Uses path.resolve to prevent "../" traversal attacks.
 */
function isPathAllowed(filePath) {
  const resolved = path.resolve(filePath).replace(/\\/g, "/")
  return ALLOWED_VIDEO_DIRS.some((dir) => resolved.startsWith(dir))
}

/**
 * Validate a timestamp string used with ffmpeg -ss.
 * Acceptable formats: "SS", "MM:SS", "HH:MM:SS", or "SS.MS"
 */
const TIMESTAMP_RE = /^(\d{1,2}:)?\d{1,2}:\d{2}(\.\d+)?$/

export const generateThumbnail = async (videoPath, options = {}) => {
  const { outputDir: rawOutputDir = "assets/generated/thumbnails", timestamp = "00:01" } =
    options
  const outputDir = resolveProjectPath(rawOutputDir)

  // ── Lazy-load ffmpeg-static (avoid crash at import time if missing) ─
  let ffmpegStaticPath
  try {
    const ffmpegStatic = await import("ffmpeg-static")
    ffmpegStaticPath = ffmpegStatic.default || ffmpegStatic.path || ffmpegStatic
  } catch {
    // fall through to null check below
  }
  if (!ffmpegStaticPath) {
    throw new Error("FFmpeg not available. Install ffmpeg-static or add FFmpeg to PATH.")
  }

  // ── Path traversal protection ────────────────────────────────────
  if (!isPathAllowed(videoPath)) {
    throw new Error(
      "Security: videoPath must be within assets/generated directory"
    )
  }

  // ── Validate timestamp format ────────────────────────────────────
  if (timestamp && !TIMESTAMP_RE.test(timestamp)) {
    throw new Error(
      "Security: invalid timestamp format. Use SS, MM:SS, or HH:MM:SS"
    )
  }

  if (!fs.existsSync(videoPath)) {
    throw new Error(`Video file not found: ${videoPath}`)
  }

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true })
  }

  const filename = `thumb_${Date.now()}.jpg`
  const outputPath = path.join(outputDir, filename)

  return new Promise((resolve, reject) => {
    const ffmpeg = spawn(ffmpegStaticPath, [
      "-y",
      "-ss",
      timestamp,
      "-i",
      videoPath,
      "-vframes",
      "1",
      "-q:v",
      "2",
      "-vf",
      "scale=1280:720",
      outputPath,
    ])

    let stderr = ""
    ffmpeg.stderr.on("data", (d) => (stderr += d.toString()))

    ffmpeg.on("close", async (code) => {
      if (code === 0 && fs.existsSync(outputPath)) {
        // 🔴 FIX: Log only basename, not full path
        const fileName = path.basename(outputPath)
        log("INFO", "Thumbnail generated", { filename: fileName })

        // Upload to R2 if configured
        let finalPath = outputPath
        if (isR2Configured()) {
          try {
            const r2Key = getBucketPath("thumbnails", fileName)
            const result = await uploadFile(r2Key, outputPath, "image/jpeg")
            if (result) {
              log("INFO", "Thumbnail uploaded to R2", { key: result.key })
              finalPath = result.key
            }
          } catch (r2Error) {
            log("WARN", "Failed to upload thumbnail to R2", { error: r2Error.message })
          }
        }

        resolve(finalPath)
      } else {
        log("ERROR", "FFmpeg thumbnail failed", { stderr: stderr.slice(-200) })
        reject(new Error("FFmpeg thumbnail failed"))
      }
    })

    ffmpeg.on("error", (err) => {
      log("ERROR", "FFmpeg error", { error: err.message })
      reject(new Error("FFmpeg thumbnail failed"))
    })
  })
}

export const generateThumbnails = async (videoPath, count = 3) => {
  // Path traversal check
  if (!isPathAllowed(videoPath)) {
    throw new Error(
      "Security: videoPath must be within assets/generated directory"
    )
  }

  const timestamps = ["00:01", "00:05", "00:10", "00:30", "00:50"]
  const results = []

  for (let i = 0; i < Math.min(count, timestamps.length); i++) {
    const thumb = await generateThumbnail(videoPath, {
      timestamp: timestamps[i],
    })
    if (thumb) results.push(thumb)
  }

  return results
}

export const getThumbnailTemplates = () => {
  return [
    { name: "shock", text: "You Won't Believe...", color: "red" },
    { name: "money", text: "Make $1000/Day", color: "green" },
    { name: "list", text: "Top 5 Ways To...", color: "blue" },
    { name: "question", text: "Is This Real?", color: "purple" },
    { name: "result", text: "Before vs After", color: "orange" },
  ]
}
