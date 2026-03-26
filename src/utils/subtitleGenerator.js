import fs from "fs"
import path from "path"

const log = (level, message, data = {}) => {
  console.log(`[${level}] [SUBTITLE] ${message}`, Object.keys(data).length ? JSON.stringify(data) : "")
}

const formatSrtTime = (seconds) => {
  const hrs = Math.floor(seconds / 3600)
  const mins = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)
  const ms = Math.round((seconds % 1) * 1000)
  
  return `${hrs.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")},${ms.toString().padStart(3, "0")}`
}

const cleanText = (text) => {
  return text
    .replace(/[*#_~`]/g, "")
    .replace(/\s+/g, " ")
    .trim()
}

const splitIntoSentences = (script) => {
  const sentences = script.match(/[^.!?]+[.!?]+/g) || [script]
  return sentences.map(s => cleanText(s)).filter(Boolean)
}

const estimateReadingTime = (text) => {
  const words = text.split(/\s+/).length
  const wordsPerMinute = 150
  return (words / wordsPerMinute) * 60
}

export const createSubtitleFile = (script, audioDuration) => {
  const subtitleDir = "assets/generated/subtitles"
  
  if (!fs.existsSync(subtitleDir)) {
    fs.mkdirSync(subtitleDir, { recursive: true })
  }

  const subtitlePath = path.join(subtitleDir, `sub-${Date.now()}.srt`)

  const estimatedDuration = estimateReadingTime(script)
  const actualDuration = audioDuration || estimatedDuration

  const sentences = splitIntoSentences(script)
  
  if (sentences.length === 0) {
    log("WARN", "No valid sentences in script")
    return null
  }

  const durationPerSentence = actualDuration / sentences.length

  let srtContent = ""
  
  sentences.forEach((sentence, index) => {
    if (!sentence || sentence.length < 2) return
    
    const startTime = index * durationPerSentence
    const endTime = (index + 1) * durationPerSentence

    const displayText = sentence.length > 50 
      ? sentence.substring(0, 47) + "..." 
      : sentence

    srtContent += `${index + 1}\n`
    srtContent += `${formatSrtTime(startTime)} --> ${formatSrtTime(endTime)}\n`
    srtContent += `${displayText}\n\n`
  })

  if (!srtContent.trim()) {
    log("ERROR", "Failed to generate subtitle content")
    throw new Error("Subtitle generation failed")
  }

  fs.writeFileSync(subtitlePath, srtContent)
  log("INFO", "Subtitles created", { path: subtitlePath, captionCount: sentences.length })

  return subtitlePath
}

export const createWordLevelSubtitles = (script, audioDuration) => {
  const words = script
    .replace(/[.,!?;:'"()]/g, "")
    .split(/\s+/)
    .filter(Boolean)

  if (words.length === 0 || audioDuration <= 0) {
    return createSubtitleFile(script, audioDuration)
  }

  const subtitleDir = "assets/generated/subtitles"
  if (!fs.existsSync(subtitleDir)) {
    fs.mkdirSync(subtitleDir, { recursive: true })
  }

  const subtitlePath = path.join(subtitleDir, `sub-words-${Date.now()}.srt`)
  const durationPerWord = audioDuration / words.length

  let srtContent = ""
  
  words.forEach((word, index) => {
    const startTime = index * durationPerWord
    const endTime = (index + 1) * durationPerWord

    srtContent += `${index + 1}\n`
    srtContent += `${formatSrtTime(startTime)} --> ${formatSrtTime(endTime)}\n`
    srtContent += `${word.toUpperCase()}\n\n`
  })

  fs.writeFileSync(subtitlePath, srtContent)
  return subtitlePath
}
