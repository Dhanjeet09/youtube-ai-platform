import { spawn } from "child_process"
import path from "path"
import fs from "fs"
import crypto from "crypto"
import { fileURLToPath } from "url"
import { createSubtitleFile } from "../utils/subtitleGenerator.js"
import { getAudioDuration } from "../utils/getAudioDuration.js"
import { log as logger } from "../utils/logger.js"
import { resolveFfmpegPath } from "../utils/findFfmpeg.js"
import { getQualityPreset } from "../modules/quality/service.js"
import { isImageKitConfigured } from "../config/imagekit.js"
import { uploadFile as ikUpload, getBucketPath } from "../services/imagekitService.js"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const log = (level, msg, data = {}) => logger(level, `[RENDER] ${msg}`, data)

// ── Constants ──────────────────────────────────────────────────────

const RENDER_TIMEOUT_MS = 10 * 60 * 1000 // 10 minutes
const STDERR_MAX_LENGTH = 5000
const AUDIO_BITRATE = "128k"

// ── Helpers ────────────────────────────────────────────────────────

/**
 * Resolve a relative project path to an absolute path based on project root.
 */
const resolveProjectPath = (relativePath) => {
  if (path.isAbsolute(relativePath)) return relativePath
  // Go up two levels: server/pipeline -> server -> project root
  return path.resolve(__dirname, "..", "..", relativePath)
}

let ffmpegPath = null

const initFfmpeg = async () => {
  if (!ffmpegPath) {
    ffmpegPath = await resolveFfmpegPath()
  }
  return ffmpegPath
}

/**
 * Validate that a file path is within one of the allowed directories.
 * Prevents path-traversal attacks.
 */
function isPathAllowed(filePath) {
  const allowedDirs = [
    resolveProjectPath("assets/generated"),
    resolveProjectPath("storage"),
  ].map((p) => p.replace(/\\/g, "/"))
  const resolved = path.resolve(filePath).replace(/\\/g, "/")
  return allowedDirs.some((dir) => resolved.startsWith(dir))
}

/**
 * Safely delete an array of file paths. Never throws.
 */
const cleanupFiles = (files) => {
  for (const file of files) {
    try {
      if (file && fs.existsSync(file)) fs.unlinkSync(file)
    } catch {
      // Best-effort cleanup
    }
  }
}

/**
 * Download a file from ImageKit URL to a local temp path for FFmpeg processing.
 * Returns the local path. If the input is already a local path, returns it as-is.
 */
async function resolveToLocalPath(filePath, tempDir) {
  // If already absolute and exists, return as-is
  if (path.isAbsolute(filePath) && fs.existsSync(filePath)) return filePath
  
  // If relative path, resolve to project root
  if (!path.isAbsolute(filePath)) {
    const resolved = resolveProjectPath(filePath)
    if (fs.existsSync(resolved)) return resolved
  }
  
  if (fs.existsSync(filePath)) return filePath

  const isImageUrl = filePath.startsWith("http://") || filePath.startsWith("https://")

  if (isImageUrl && isImageKitConfigured()) {
    log("INFO", "Downloading from ImageKit for FFmpeg processing", { url: filePath.slice(0, 80) + "..." })
    const axios = (await import("axios")).default
    const response = await axios({
      url: filePath,
      method: "GET",
      responseType: "stream",
      timeout: 120000,
    })

    const localFileName = path.basename(new URL(filePath).pathname) || `temp-${Date.now()}.mp4`
    const localPath = path.join(tempDir, localFileName)
    const writeStream = fs.createWriteStream(localPath)

    await new Promise((resolve, reject) => {
      response.data.pipe(writeStream)
      writeStream.on("finish", resolve)
      writeStream.on("error", reject)
    })

    log("INFO", "Downloaded from ImageKit for processing", { local: localPath })
    return localPath
  }

  throw new Error(`File not found: ${filePath}`)
}

// ── Main render function ───────────────────────────────────────────

export const renderVideo = async (audioPath, videoPath, script, options = {}) => {
  const {
    quality = "medium",
    outputDir: rawOutputDir = "assets/generated/final-videos",
    orientation = "portrait",
    generateSubtitles = true,
  } = options
  const outputDir = resolveProjectPath(rawOutputDir)

  // ── Null / undefined guard ──────────────────────────────────────
  if (!audioPath || typeof audioPath !== "string") {
    throw new Error("audioPath is required and must be a non-empty string")
  }
  if (!videoPath || typeof videoPath !== "string") {
    throw new Error("videoPath is required and must be a non-empty string")
  }

  // ── Create temp directory for ImageKit downloads ────────────────
  const tempDir = path.join(outputDir, ".temp-downloads")
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true })
  }

  // ── Resolve URLs to local files for FFmpeg processing ───────────
  log("INFO", "Resolving paths", { audioPath, videoPath })
  const localAudioPath = await resolveToLocalPath(audioPath, tempDir)
  const localVideoPath = await resolveToLocalPath(videoPath, tempDir)
  log("INFO", "Resolved paths", { localAudioPath, localVideoPath })

  // ── Path traversal protection ───────────────────────────────────
  if (!isPathAllowed(localAudioPath)) {
    throw new Error("Security: audioPath must be within assets/generated or storage directory")
  }
  if (!isPathAllowed(localVideoPath)) {
    throw new Error("Security: videoPath must be within assets/generated or storage directory")
  }

  if (!fs.existsSync(localAudioPath)) throw new Error(`Audio not found: ${localAudioPath}`)
  if (!fs.existsSync(localVideoPath)) throw new Error(`Video not found: ${localVideoPath}`)

  const ffmpeg = await initFfmpeg()
  if (!ffmpeg) {
    throw new Error("FFmpeg not available. Please install FFmpeg or ffmpeg-static package.")
  }

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true })
  }

  const outputPath = path.join(
    outputDir,
    `final_${Date.now()}_${crypto.randomUUID().slice(0, 8)}.mp4`
  )

  // Audio duration detection
  let audioDuration
  try {
    audioDuration = await getAudioDuration(localAudioPath)
  } catch {
    audioDuration = (script.split(/\s+/).length / 150) * 60
    log("WARN", "Could not determine actual audio duration, using estimate", { audioDuration })
  }

  // ── Generate subtitle file before FFmpeg ────────────────────────
  let subtitlePath = null
  if (generateSubtitles && script) {
    try {
      subtitlePath = await createSubtitleFile(script, audioDuration)
      log("INFO", "Subtitles created for render", { subtitlePath })
    } catch (err) {
      log("WARN", "Subtitle generation failed, continuing without subtitles", { error: err.message })
    }
  }

  log("INFO", "Starting render", { audioDuration, quality, hasSubtitles: !!subtitlePath })

  return new Promise((resolve, reject) => {
    const startTime = Date.now()
    const preset = getQualityPreset(quality)

    const scaleFilter =
      orientation === "landscape"
        ? "scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080"
        : "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920"

    // Build subtitle filter if subtitle file exists
    // Windows paths: FFmpeg subtitle filter treats ':' as option separator.
    // Fix: convert to forward slashes and escape colons with double backslash.
    const subtitleFilter = subtitlePath
      ? `subtitles=${subtitlePath.replace(/\\/g, "/").replace(/:/g, "\\\\:")}`
      : null

    const videoFilter = subtitleFilter ? `${scaleFilter},${subtitleFilter}` : scaleFilter

    const args = [
      "-y",
      "-i", localVideoPath,
      "-i", localAudioPath,
      "-vf", videoFilter,
      "-c:v", "libx264",
      "-preset", preset.preset,
      "-crf", preset.crf,
      "-c:a", "aac",
      "-b:a", AUDIO_BITRATE,
      "-movflags", "+faststart",
      "-shortest",
      outputPath,
    ]

    log("INFO", "Running ffmpeg", {
      inputCount: 2,
      outputCodec: "libx264",
      audioCodec: "aac",
      audioBitrate: AUDIO_BITRATE,
      preset: preset.preset,
      crf: preset.crf,
      hasSubtitles: !!subtitlePath,
    })

    const ffmpegProcess = spawn(ffmpeg, args)

    const renderTimer = setTimeout(() => {
      ffmpegProcess.kill("SIGKILL")
      reject(new Error("FFmpeg process timed out after 10 minutes"))
    }, RENDER_TIMEOUT_MS)

    let stderrLog = ""

    ffmpegProcess.stderr.on("data", (data) => {
      const chunk = data.toString()
      stderrLog += chunk
      if (stderrLog.length > STDERR_MAX_LENGTH) {
        stderrLog = stderrLog.slice(-STDERR_MAX_LENGTH)
      }
    })

    ffmpegProcess.on("close", async (code) => {
      clearTimeout(renderTimer)

      // Clean up temp download directory
      try {
        if (fs.existsSync(tempDir)) {
          const tempFiles = fs.readdirSync(tempDir)
          cleanupFiles(tempFiles.map((f) => path.join(tempDir, f)))
          fs.rmdirSync(tempDir)
        }
      } catch {
        // Best-effort cleanup
      }

      const duration = ((Date.now() - startTime) / 1000).toFixed(2)

      if (code !== 0) {
        log("ERROR", "Render failed", { code, stderr: stderrLog.slice(-1000) })
        reject(new Error(`FFmpeg failed with code ${code}`))
        return
      }

      if (!fs.existsSync(outputPath)) {
        reject(new Error("Output file not created"))
        return
      }

      const outputSize = fs.statSync(outputPath).size

      if (outputSize === 0) {
        reject(new Error("Output file is empty"))
        return
      }

      log("INFO", "Render complete", {
        duration: `${duration}s`,
        size: `${(outputSize / 1024 / 1024).toFixed(2)}MB`,
        hasSubtitles: !!subtitlePath,
      })

      // Upload final video + subtitles to ImageKit if configured
      const resultPaths = { videoPath: outputPath, subtitlePath }
      if (isImageKitConfigured()) {
        const outputFileName = path.basename(outputPath)
        try {
          const { folder: videoFolder } = getBucketPath("final-videos", outputFileName)
          const ikResult = await ikUpload(outputPath, outputFileName, videoFolder)
          if (ikResult) {
            log("INFO", "Final video uploaded to ImageKit", { url: ikResult.url })
            resultPaths.videoImageKitUrl = ikResult.url
          }
        } catch (ikError) {
          log("WARN", "Failed to upload final video to ImageKit", { error: ikError.message })
        }

        if (subtitlePath && fs.existsSync(subtitlePath)) {
          try {
            const subFileName = path.basename(subtitlePath)
            const { folder: subFolder } = getBucketPath("subtitles", subFileName)
            const subResult = await ikUpload(subtitlePath, subFileName, subFolder)
            if (subResult) {
              log("INFO", "Subtitles uploaded to ImageKit", { url: subResult.url })
              resultPaths.subtitleImageKitUrl = subResult.url
            }
          } catch (ikSubError) {
            log("WARN", "Failed to upload subtitles to ImageKit", { error: ikSubError.message })
          }
        }
      }

      resultPaths.localVideoPath = outputPath
      resolve(resultPaths)
    })

    ffmpegProcess.on("error", (err) => {
      log("ERROR", "FFmpeg spawn error", { error: err.message })
      reject(err)
    })
  })
}


