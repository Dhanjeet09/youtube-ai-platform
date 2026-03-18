import { spawn } from "child_process"
import ffmpegPath from "ffmpeg-static"

export const getAudioDuration = (audioPath) => {

  return new Promise((resolve, reject) => {

    const ffmpeg = spawn(ffmpegPath, [
      "-i",
      audioPath
    ])

    ffmpeg.stderr.on("data", data => {

      const output = data.toString()

      const match = output.match(/Duration: (\d+):(\d+):(\d+\.\d+)/)

      if (match) {

        const hours = parseInt(match[1])
        const minutes = parseInt(match[2])
        const seconds = parseFloat(match[3])

        const duration =
          hours * 3600 +
          minutes * 60 +
          seconds

        resolve(duration)

      }

    })

    ffmpeg.on("error", reject)

  })
}