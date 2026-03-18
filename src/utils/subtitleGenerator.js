import fs from "fs"
import path from "path"

export const createSubtitleFile = (script, audioDuration) => {

  const subtitleDir = "assets/generated/subtitles"

  if (!fs.existsSync(subtitleDir)) {
    fs.mkdirSync(subtitleDir, { recursive: true })
  }

  const id = Date.now()
  const subtitlePath = path.join(subtitleDir, `sub-${id}.srt`)

  const words = script
    .replace(/[.,!?]/g, "")
    .split(/\s+/)
    .filter(Boolean)

  const wordsPerCaption = 3

  const captions = []

  for (let i = 0; i < words.length; i += wordsPerCaption) {
    captions.push(words.slice(i, i + wordsPerCaption).join(" "))
  }

  const durationPerCaption = audioDuration / captions.length

  let currentTime = 0
  let srtContent = ""

  const format = (seconds) => {
    const date = new Date(seconds * 1000)
    return date.toISOString().substr(11, 12).replace(".", ",")
  }

  captions.forEach((line, index) => {

    const start = currentTime
    const end = start + durationPerCaption

    srtContent += `${index + 1}\n`
    srtContent += `${format(start)} --> ${format(end)}\n`
    srtContent += `${line.toUpperCase()}\n\n`

    currentTime = end
  })

  fs.writeFileSync(subtitlePath, srtContent)

  return subtitlePath
}