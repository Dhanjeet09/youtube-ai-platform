import axios from "axios"
import fs from "fs"
import path from "path"
import { spawn } from "child_process"
import ffmpegPath from "ffmpeg-static"

const log = (level, message, data = {}) => {
  console.log(`[${level}] [THUMBNAIL] ${message}`, Object.keys(data).length ? JSON.stringify(data) : "")
}

export const generateThumbnail = async (videoPath, options = {}) => {
  const {
    outputDir = "assets/generated/thumbnails",
    timestamp = "00:01"
  } = options

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true })
  }

  const filename = `thumb_${Date.now()}.jpg`
  const outputPath = path.join(outputDir, filename)

  return new Promise((resolve, reject) => {
    const ffmpeg = spawn(ffmpegPath, [
      "-y",
      "-ss", timestamp,
      "-i", videoPath,
      "-vframes", "1",
      "-q:v", "2",
      "-vf", "scale=1280:720",
      outputPath
    ])

    let stderr = ""
    ffmpeg.stderr.on("data", d => stderr += d.toString())

    ffmpeg.on("close", (code) => {
      if (code === 0 && fs.existsSync(outputPath)) {
        log("INFO", "Thumbnail generated", { outputPath })
        resolve(outputPath)
      } else {
        log("ERROR", "Thumbnail failed", { stderr: stderr.slice(-200) })
        resolve(null)
      }
    })

    ffmpeg.on("error", (err) => {
      log("ERROR", "FFmpeg error", { error: err.message })
      resolve(null)
    })
  })
}

export const generateThumbnails = async (videoPath, count = 3) => {
  const timestamps = ["00:01", "00:05", "00:10", "00:30", "00:50"]
  const results = []

  for (let i = 0; i < Math.min(count, timestamps.length); i++) {
    const thumb = await generateThumbnail(videoPath, { timestamp: timestamps[i] })
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
    { name: "result", text: "Before vs After", color: "orange" }
  ]
}
