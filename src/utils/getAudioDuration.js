import { spawn } from "child_process"
import ffmpegPath from "ffmpeg-static"

export const getAudioDuration = async (audioPath) => {
  return new Promise((resolve, reject) => {
    let resolved = false
    let duration = null

    const ffmpeg = spawn(ffmpegPath, [
      "-i",
      audioPath
    ])

    ffmpeg.stderr.on("data", data => {
      const output = data.toString()

      const match = output.match(/Duration: (\d+):(\d+):(\d+\.\d+)/)

      if (match && !resolved) {
        const hours = parseInt(match[1])
        const minutes = parseInt(match[2])
        const seconds = parseFloat(match[3])

        duration = hours * 3600 + minutes * 60 + seconds
      }
    })

    ffmpeg.on("close", () => {
      if (duration !== null && !resolved) {
        resolved = true
        resolve(duration)
      } else if (!resolved) {
        resolved = true
        reject(new Error(`Could not determine audio duration for: ${audioPath}`))
      }
    })

    ffmpeg.on("error", (err) => {
      if (!resolved) {
        resolved = true
        reject(new Error(`FFmpeg error: ${err.message}`))
      }
    })
  })
}

export const estimateDuration = (text) => {
  const wordsPerMinute = 150
  const wordCount = text.split(/\s+/).length
  return (wordCount / wordsPerMinute) * 60
}
