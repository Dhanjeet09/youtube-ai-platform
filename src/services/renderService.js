import { spawn } from "child_process"
import ffmpegPath from "ffmpeg-static"
import fs from "fs"
import path from "path"

export const renderVideo = async (audioPath, videoPath) => {

  const outputDir = "assets/generated/videos"

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true })
  }

  const outputPath = path.join(outputDir, "final-video.mp4")

  // Debug checks
  if (!fs.existsSync(audioPath)) {
    throw new Error(`Audio file not found: ${audioPath}`)
  }

  if (!fs.existsSync(videoPath)) {
    throw new Error(`Video file not found: ${videoPath}`)
  }

  return new Promise((resolve, reject) => {

    const ffmpeg = spawn(ffmpegPath, [
      "-y",
      "-i", videoPath,
      "-i", audioPath,
      "-c:v", "copy",
      "-c:a", "aac",
      "-shortest",
      outputPath
    ])

    ffmpeg.stderr.on("data", data => {
      console.log(`FFmpeg: ${data}`)
    })

    ffmpeg.on("close", code => {
      if (code === 0) {
        console.log("Video rendering completed")
        resolve(outputPath)
      } else {
        reject(new Error(`FFmpeg failed with code ${code}`))
      }
    })

  })
}