import { spawn } from "child_process"
import ffmpegPath from "ffmpeg-static"
import path from "path"
import fs from "fs"

export const renderVideo = async (audioPath, videoPath) => {

  const outputPath = path.join(
    "assets/generated/videos/",
    "final-video.mp4"
  )

  return new Promise((resolve, reject) => {

    const ffmpeg = spawn(ffmpegPath, [
      "-y",
      "-i", videoPath,
      "-i", audioPath,

      "-map", "0:v:0",
      "-map", "1:a:0",

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
        resolve(outputPath)
      } else {
        reject(new Error(`FFmpeg failed with code ${code}`))
      }
    })

  })

}