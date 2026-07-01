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
import { isR2Configured } from "../config/r2.js"
import { uploadFile, getBucketPath, getFileStream } from "../services/r2Service.js"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

/**
 * Resolve a relative project path to an absolute path based on project root.
 */
const resolveProjectPath = (relativePath) => {
  if (path.isAbsolute(relativePath)) return relativePath
  return path.resolve(__dirname, "..", relativePath)
}

const log = (level, message, data = {}) => logger(level, `[RENDER] ${message}`, data)

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
 * Download a file from R2 to a local temp path for FFmpeg processing.
 * Returns the local path. If the input is already a local path, returns it as-is.
 */
async function resolveToLocalPath(filePath, tempDir) {
  // If it's already a local file that exists, return it
  if (fs.existsSync(filePath)) return filePath

  // Check if it's an R2 key (starts with a known prefix)
  const r2Prefixes = ["audio/", "videos/", "final-videos/", "subtitles/", "thumbnails/"]
  const isR2Key = r2Prefixes.some((p) => filePath.startsWith(p))

  if (isR2Key && isR2Configured()) {
    log("INFO", "Downloading from R2 for FFmpeg processing", { key: filePath })
    const fileData = await getFileStream(filePath)
    if (!fileData) {
      throw new Error(`File not found in R2: ${filePath}`)
    }

    const localFileName = path.basename(filePath)
    const localPath = path.join(tempDir, localFileName)
    const writeStream = fs.createWriteStream(localPath)

    await new Promise((resolve, reject) => {
      fileData.stream.pipe(writeStream)
      writeStream.on("finish", resolve)
      writeStream.on("error", reject)
    })

    log("INFO", "Downloaded from R2 for processing", { key: filePath, local: localPath })
    return localPath
  }

  throw new Error(`File not found: ${filePath}`)
}

export const renderVideo = async (audioPath, videoPath, script, options = {}) => {
  const { quality = "medium", outputDir: rawOutputDir = "assets/generated/final-videos", orientation = "portrait", generateSubtitles = true } = options
  const outputDir = resolveProjectPath(rawOutputDir)

  // ── Null / undefined guard ───────────────────────────────────────
  if (!audioPath || typeof audioPath !== "string") {
    throw new Error("audioPath is required and must be a non-empty string")
  }
  if (!videoPath || typeof videoPath !== "string") {
    throw new Error("videoPath is required and must be a non-empty string")
  }

  // ── Create temp directory for R2 downloads ─────────────────────
  const tempDir = path.join(outputDir, ".r2-temp")
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true })
  }

  // ── Resolve R2 keys to local files for FFmpeg processing ──────
  const localAudioPath = await resolveToLocalPath(audioPath, tempDir)
  const localVideoPath = await resolveToLocalPath(videoPath, tempDir)

  // ── Path traversal protection ────────────────────────────────────
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

  const outputPath = path.join(outputDir, `final_${Date.now()}_${crypto.randomUUID().slice(0, 8)}.mp4`)

  // Audio duration detection — uses resolved local path
  let audioDuration
  try {
    audioDuration = await getAudioDuration(localAudioPath)
  } catch {
    audioDuration = (script.split(/\s+/).length / 150) * 60
    log("WARN", "Could not determine actual audio duration, using estimate", { audioDuration })
  }

  // ── Generate subtitle file before FFmpeg ──
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

    const scaleFilter = orientation === "landscape"
      ? "scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080"
      : "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920"

    // Build subtitle filter if subtitle file exists
    // 🔴 FIX: Correctly escape path for FFmpeg filter graph syntax.
    // Backslashes → forward slashes, then colons escaped as \:
    // (single backslash in the actual string for FFmpeg's filter parser)
    const subtitleFilter = subtitlePath
      ? `subtitles=${subtitlePath.replace(/\\/g, '/').replace(/:/g, '\\:')}`
      : null

    const videoFilter = subtitleFilter
      ? `${scaleFilter},${subtitleFilter}`
      : scaleFilter

    const args = [
      "-y",
      "-i", localVideoPath,
      "-i", localAudioPath,
      "-vf", videoFilter,
      "-c:v", "libx264",
      "-preset", preset.preset,
      "-crf", preset.crf,
      "-c:a", "aac",
      "-shortest",
      outputPath
    ]

    // 🔴 FIX: Don't log full ffmpeg args — they contain internal file paths
    // that could leak the server directory structure. Log only metadata.
    log("INFO", "Running ffmpeg", {
      inputCount: 2,
      outputCodec: "libx264",
      audioCodec: "aac",
      preset: preset.preset,
      crf: preset.crf,
      hasSubtitles: !!subtitlePath,
    })

    const ffmpegProcess = spawn(ffmpeg, args)

    // Safety timeout: kill FFmpeg if it hangs longer than 10 minutes
    const RENDER_TIMEOUT_MS = 10 * 60 * 1000
    const renderTimer = setTimeout(() => {
      ffmpegProcess.kill("SIGKILL")
      reject(new Error("FFmpeg process timed out after 10 minutes"))
    }, RENDER_TIMEOUT_MS)

    let stderrLog = ""
    const STDERR_MAX_LENGTH = 5000 // prevent unbounded memory growth

    ffmpegProcess.stderr.on("data", (data) => {
      const chunk = data.toString()
      stderrLog += chunk
      if (stderrLog.length > STDERR_MAX_LENGTH) {
        stderrLog = stderrLog.slice(-STDERR_MAX_LENGTH)
      }
    })

    ffmpegProcess.on("close", async (code) => {
      clearTimeout(renderTimer)
      const duration = ((Date.now() - startTime) / 1000).toFixed(2)

      // Clean up R2 temp download directory
      try {
        if (fs.existsSync(tempDir)) {
          const tempFiles = fs.readdirSync(tempDir)
          for (const f of tempFiles) {
            fs.unlinkSync(path.join(tempDir, f))
          }
          fs.rmdirSync(tempDir)
        }
      } catch (cleanupErr) {
        // Best-effort cleanup
      }

      if (code === 0) {
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
          outputPath,
          duration: `${duration}s`,
          size: `${(outputSize / 1024 / 1024).toFixed(2)}MB`,
          subtitlePath
        })

        // Upload final video to R2 if configured
        const resultPaths = { videoPath: outputPath, subtitlePath }
        if (isR2Configured()) {
          const outputFileName = path.basename(outputPath)
          try {
            const r2VideoKey = getBucketPath("final-videos", outputFileName)
            const r2Result = await uploadFile(r2VideoKey, outputPath, "video/mp4")
            if (r2Result) {
              log("INFO", "Final video uploaded to R2", { key: r2Result.key })
              resultPaths.videoPath = r2Result.key
              resultPaths.videoR2Key = r2Result.key
            }
          } catch (r2Error) {
            log("WARN", "Failed to upload final video to R2", { error: r2Error.message })
          }

          // Upload subtitle file to R2 if it exists
          if (subtitlePath && fs.existsSync(subtitlePath)) {
            try {
              const subFileName = path.basename(subtitlePath)
              const r2SubKey = getBucketPath("subtitles", subFileName)
              const subResult = await uploadFile(r2SubKey, subtitlePath)
              if (subResult) {
                log("INFO", "Subtitles uploaded to R2", { key: subResult.key })
                resultPaths.subtitlePath = subResult.key
                resultPaths.subtitleR2Key = subResult.key
              }
            } catch (r2SubError) {
              log("WARN", "Failed to upload subtitles to R2", { error: r2SubError.message })
            }
          }
        }

        // Always include the local output path for thumbnail generation etc.
        resultPaths.localVideoPath = outputPath

        // Resolve with both the video path and subtitle path
        resolve(resultPaths)
      } else {
        log("ERROR", "Render failed", { code, stderr: stderrLog.slice(-1000) })
        reject(new Error(`FFmpeg failed with code ${code}`))
      }
    })

    ffmpegProcess.on("error", (err) => {
      log("ERROR", "FFmpeg spawn error", { error: err.message })
      reject(err)
    })
  })
}
