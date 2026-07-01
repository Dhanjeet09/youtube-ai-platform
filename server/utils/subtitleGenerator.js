import fs from "fs"
import { access, mkdir, writeFile } from "fs/promises"
import path from "path"
import { fileURLToPath } from "url"
import { log as logger } from "./logger.js"
import { isR2Configured } from "../config/r2.js"
import { uploadFile, getBucketPath } from "../services/r2Service.js"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const log = (level, message, data = {}) => logger(level, `[SUBTITLE] ${message}`, data)

/**
 * Resolve a relative project path to an absolute path based on project root.
 */
const resolveProjectPath = (relativePath) => {
  if (path.isAbsolute(relativePath)) return relativePath
  return path.resolve(__dirname, "..", relativePath)
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

export const createSubtitleFile = async (script, audioDuration) => {
  const subtitleDir = resolveProjectPath("assets/generated/subtitles")
  
  try {
    await access(subtitleDir)
  } catch {
    await mkdir(subtitleDir, { recursive: true })
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

  await writeFile(subtitlePath, srtContent)
  const fileName = path.basename(subtitlePath)
  log("INFO", "Subtitles created", { path: subtitlePath, captionCount: sentences.length })

  // Upload to R2 if configured
  if (isR2Configured()) {
    try {
      const r2Key = getBucketPath("subtitles", fileName)
      const result = await uploadFile(r2Key, subtitlePath, "text/plain; charset=utf-8")
      if (result) {
        log("INFO", "Subtitles uploaded to R2", { key: result.key })
      }
    } catch (r2Error) {
      log("WARN", "Failed to upload subtitles to R2", { error: r2Error.message })
    }
  }

  return subtitlePath
}

export const createWordLevelSubtitles = async (script, audioDuration) => {
  const words = script
    .replace(/[.,!?;:'"()]/g, "")
    .split(/\s+/)
    .filter(Boolean)

  if (words.length === 0 || audioDuration <= 0) {
    return createSubtitleFile(script, audioDuration)
  }

  const subtitleDir = resolveProjectPath("assets/generated/subtitles")
  try {
    await access(subtitleDir)
  } catch {
    await mkdir(subtitleDir, { recursive: true })
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

  await writeFile(subtitlePath, srtContent)
  return subtitlePath
}
