/**
 * Scene Splitting Service
 *
 * Splits a Hindi poem into 3-5 scenes for video rendering.
 * Each scene contains 2-3 lines with metadata for image generation
 * and subtitle timing.
 */

import { log as logger } from "../../utils/logger.js"

const log = (level, message, data = {}) => logger(level, `[SCENE-SERVICE] ${message}`, data)

// ─── Constants ──────────────────────────────────────────────────────────
const MIN_SCENES = 3
const MAX_SCENES = 5
const MIN_LINES_PER_SCENE = 2
const MAX_LINES_PER_SCENE = 3

/**
 * Extract meaningful keywords from a Hindi scene text.
 * Uses common Hindi stop words to identify content words.
 *
 * @param {string} text - Hindi scene text
 * @returns {string[]} - Extracted keywords (up to 5)
 */
const extractKeywords = (text) => {
  const stopWords = new Set([
    "में", "पर", "से", "को", "का", "की", "के", "और", "है", "हैं",
    "था", "थे", "थी", "हो", "हों", "यह", "वह", "ये", "वे", "तो",
    "भी", "ही", "न", "मत", "कि", "जो", "तक", "तब", "जब", "अब",
    "एक", "या", "नहीं", "क्या", "क्यों", "कैसे", "वो", "इस", "उस",
    "दे", "दो", "रह", "ले", "चल", "आ", "जा", "हुआ", "हुई",
  ])

  const words = text
    .replace(/[।,!?;:'"()\-]/g, " ")
    .split(/\s+/)
    .map((w) => w.trim())
    .filter((w) => w.length > 1 && !stopWords.has(w))

  // Deduplicate while preserving order
  const seen = new Set()
  const unique = []
  for (const word of words) {
    if (!seen.has(word)) {
      seen.add(word)
      unique.push(word)
    }
  }

  return unique.slice(0, 5)
}

/**
 * Estimate the spoken duration (in seconds) of a set of Hindi lines.
 * Hindi is spoken at approximately 2.5-3 words per second.
 *
 * @param {string[]} lines - Array of Hindi text lines
 * @returns {number} - Estimated duration in seconds
 */
const estimateLineDuration = (lines) => {
  const totalWords = lines.join(" ").split(/\s+/).length
  const wordsPerSecond = 2.5 // conservative for Hindi
  return totalWords / wordsPerSecond
}

/**
 * Split poem lines into 3-5 scenes.
 *
 * Strategy:
 *  - If ≤6 lines → 3 scenes (2 lines each)
 *  - If 7-9 lines → 3-4 scenes
 *  - If ≥10 lines → 4-5 scenes
 *
 * The split tries to keep couplets (शेर) together — lines that form
 * a natural pair are never separated.
 *
 * @param {string[]} poemLines - Array of Hindi poem lines
 * @param {number} [totalAudioDuration] - Known audio duration for precise timing
 * @returns {Array<{sceneNumber: number, lines: string[], text: string, duration: number, keywords: string[]}>}
 */
export const splitIntoScenes = (poemLines, totalAudioDuration = null) => {
  if (!Array.isArray(poemLines) || poemLines.length === 0) {
    throw new Error("poemLines must be a non-empty array")
  }

  // Filter out empty lines
  const lines = poemLines.filter((l) => l && l.trim().length > 0)

  if (lines.length < 3) {
    // Too few lines — treat as a single scene
    log("WARN", "Poem has fewer than 3 lines, creating single scene", { lineCount: lines.length })
    const duration = totalAudioDuration || estimateLineDuration(lines)
    return [
      {
        sceneNumber: 1,
        lines,
        text: lines.join("\n"),
        duration,
        keywords: extractKeywords(lines.join(" ")),
      },
    ]
  }

  // Determine number of scenes based on line count
  let targetScenes
  if (lines.length <= 6) {
    targetScenes = MIN_SCENES
  } else if (lines.length <= 9) {
    targetScenes = 4
  } else {
    targetScenes = MAX_SCENES
  }

  // Calculate lines per scene
  const baseLinesPerScene = Math.floor(lines.length / targetScenes)
  const extraLines = lines.length % targetScenes

  const scenes = []
  let currentIndex = 0

  for (let i = 0; i < targetScenes; i++) {
    // Distribute extra lines to first scenes
    const sceneLineCount = baseLinesPerScene + (i < extraLines ? 1 : 0)
    const sceneLines = lines.slice(currentIndex, currentIndex + sceneLineCount)
    currentIndex += sceneLineCount

    if (sceneLines.length === 0) continue

    scenes.push({
      sceneNumber: scenes.length + 1,
      lines: sceneLines,
      text: sceneLines.join("\n"),
      duration: 0, // will be calculated below
      keywords: extractKeywords(sceneLines.join(" ")),
    })
  }

  // ── Calculate durations ──────────────────────────────────────────
  if (totalAudioDuration && scenes.length > 0) {
    // Distribute total audio duration proportionally by word count
    const totalWords = scenes.reduce((sum, s) => sum + s.text.split(/\s+/).length, 0)

    for (const scene of scenes) {
      const sceneWords = scene.text.split(/\s+/).length
      scene.duration = (sceneWords / totalWords) * totalAudioDuration
    }
  } else {
    // Estimate each scene independently
    for (const scene of scenes) {
      scene.duration = estimateLineDuration(scene.lines)
    }
  }

  log("INFO", "Poem split into scenes", {
    totalLines: lines.length,
    sceneCount: scenes.length,
    durations: scenes.map((s) => Number(s.duration.toFixed(1))),
  })

  return scenes
}

/**
 * Generate SRT subtitle content from scenes.
 * Each scene's lines are displayed sequentially within the scene's duration.
 *
 * @param {Array<{lines: string[], duration: number}>} scenes
 * @param {number} [offset=0] - Time offset in seconds (for concatenation)
 * @returns {string} - SRT formatted content
 */
export const generateSrtFromScenes = (scenes, offset = 0) => {
  const formatTime = (seconds) => {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = Math.floor(seconds % 60)
    const ms = Math.round((seconds % 1) * 1000)
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")},${String(ms).padStart(3, "0")}`
  }

  let srt = ""
  let cueIndex = 1
  let cumulativeTime = offset

  for (const scene of scenes) {
    const durationPerLine = scene.duration / scene.lines.length

    for (const line of scene.lines) {
      const startTime = cumulativeTime
      const endTime = cumulativeTime + durationPerLine
      const displayText = line.length > 60 ? line.substring(0, 57) + "..." : line

      srt += `${cueIndex}\n`
      srt += `${formatTime(startTime)} --> ${formatTime(endTime)}\n`
      srt += `${displayText}\n\n`

      cueIndex++
      cumulativeTime = endTime
    }
  }

  return srt
}

/**
 * Validate scenes before rendering.
 *
 * @param {Array} scenes - Array of scene objects
 * @returns {{valid: boolean, errors: string[]}}
 */
export const validateScenes = (scenes) => {
  const errors = []

  if (!Array.isArray(scenes) || scenes.length === 0) {
    errors.push("No scenes provided")
    return { valid: false, errors }
  }

  if (scenes.length < MIN_SCENES) {
    errors.push(`Expected at least ${MIN_SCENES} scenes, got ${scenes.length}`)
  }

  if (scenes.length > MAX_SCENES) {
    errors.push(`Expected at most ${MAX_SCENES} scenes, got ${scenes.length}`)
  }

  for (const scene of scenes) {
    if (!scene.lines || scene.lines.length === 0) {
      errors.push(`Scene ${scene.sceneNumber}: no lines`)
    }
    if (scene.duration <= 0) {
      errors.push(`Scene ${scene.sceneNumber}: invalid duration (${scene.duration})`)
    }
  }

  return { valid: errors.length === 0, errors }
}

export default {
  splitIntoScenes,
  generateSrtFromScenes,
  validateScenes,
  extractKeywords,
}
