import { spawn, execSync } from "child_process"
import path from "path"
import fs from "fs"
import { createSubtitleFile } from "../utils/subtitleGenerator.js"
import { estimateDuration } from "../utils/getAudioDuration.js"

const log = (level, message, data = {}) => {
  console.log(`[${level}] [RENDER] ${message}`, Object.keys(data).length ? JSON.stringify(data) : "")
}

const getFfmpegPath = async () => {
  const isWin = process.platform === "win32"
  
  try {
    const result = execSync(isWin ? "where ffmpeg" : "which ffmpeg", { encoding: "utf8" })
    const systemPath = result.split("\n")[0].trim()
    if (systemPath && fs.existsSync(systemPath)) {
      log("INFO", "Using system FFmpeg", { path: systemPath })
      return systemPath
    }
  } catch {
    log("WARN", "System FFmpeg not found")
  }

  try {
    const ffmpegStatic = await import("ffmpeg-static")
    const staticPath = ffmpegStatic.default || ffmpegStatic.path || ffmpegStatic
    log("INFO", "Using ffmpeg-static", { path: staticPath })
    return staticPath
  } catch (err) {
    log("ERROR", "ffmpeg-static not available", { error: err.message })
    return null
  }
}

let ffmpegPath = null

const initFfmpeg = async () => {
  if (!ffmpegPath) {
    ffmpegPath = await getFfmpegPath()
  }
  return ffmpegPath
}

const RENDER_QUALITY_PRESETS = {
  high: { crf: 18, preset: "slow" },
  medium: { crf: 23, preset: "medium" },
  low: { crf: 28, preset: "fast" }
}

export const renderVideo = async (audioPath, videoPath, script, options = {}) => {
  const { quality = "medium", outputDir = "assets/generated/final-videos" } = options

  if (!fs.existsSync(audioPath)) throw new Error(`Audio not found: ${audioPath}`)
  if (!fs.existsSync(videoPath)) throw new Error(`Video not found: ${videoPath}`)

  const ffmpeg = await initFfmpeg()
  if (!ffmpeg) {
    throw new Error("FFmpeg not available. Please install FFmpeg or ffmpeg-static package.")
  }

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true })
  }

  const outputPath = path.join(outputDir, `final_${Date.now()}.mp4`)
  const audioDuration = estimateDuration(script)

  log("INFO", "Starting render", { audioDuration, quality })

  return new Promise((resolve, reject) => {
    const startTime = Date.now()
    const preset = RENDER_QUALITY_PRESETS[quality] || RENDER_QUALITY_PRESETS.medium

    const args = [
      "-y",
      "-i", videoPath,
      "-i", audioPath,
      "-vf", "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920",
      "-c:v", "libx264",
      "-preset", preset.preset,
      "-crf", preset.crf,
      "-c:a", "aac",
      "-shortest",
      outputPath
    ]

    log("INFO", "Running ffmpeg", { args: args.join(" ") })

    const ffmpegProcess = spawn(ffmpeg, args)

    let stderrLog = ""

    ffmpegProcess.stderr.on("data", (data) => {
      stderrLog += data.toString()
    })

    ffmpegProcess.on("close", (code) => {
      const duration = ((Date.now() - startTime) / 1000).toFixed(2)

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
          size: `${(outputSize / 1024 / 1024).toFixed(2)}MB`
        })

        resolve(outputPath)
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
