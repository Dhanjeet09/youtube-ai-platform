import { spawn } from "child_process"
import ffmpegPath from "ffmpeg-static"
import path from "path"
import fs from "fs"

export const renderVideo = async (audioPath, videoPath) => {

  const outputDir = "assets/generated/final-videos"

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true })
  }

  const outputPath = path.join(
    outputDir,
    `final_${Date.now()}.mp4`
  )

  return new Promise((resolve, reject) => {

    const ffmpeg = spawn(ffmpegPath, [

      "-y",

      "-i", videoPath,
      "-i", audioPath,

      // convert to vertical
      "-vf",
      "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920",

      "-map", "0:v:0",
      "-map", "1:a:0",

      "-c:v", "libx264",
      "-c:a", "aac",

      "-shortest",

      outputPath

    ])

    ffmpeg.stderr.on("data", data => {
      console.log("FFmpeg:", data.toString())
    })

    ffmpeg.on("close", code => {

      if (code === 0) {
        console.log("Video rendered:", outputPath)
        resolve(outputPath)
      } else {
        reject(new Error("FFmpeg render failed"))
      }

    })

  })
}