/**
 * Quality Check Service (Poem Pipeline)
 *
 * Validates rendered video output against quality standards:
 *  - Video duration: 15-30 seconds
 *  - Resolution: 1080x1920 (portrait)
 *  - Audio exists and is valid
 *  - Subtitles are present and reasonable
 *
 * Returns a structured quality report for each check.
 */

import { spawn } from "child_process"
import fs from "fs"
import { getAudioDuration } from "../../utils/getAudioDuration.js"
import { resolveFfmpegPath } from "../../utils/findFfmpeg.js"
import { log as logger } from "../../utils/logger.js"

const log = (level, message, data = {}) => logger(level, `[QUALITY-SERVICE] ${message}`, data)

// ─── Quality Thresholds ─────────────────────────────────────────────────

const THRESHOLDS = {
  video: {
    minDurationSec: 15,
    maxDurationSec: 60,   // Shorts can be up to 60s
    expectedWidth: 1080,
    expectedHeight: 1920,
    tolerancePixels: 10,  // Allow ±10px deviation
  },
  audio: {
    minDurationSec: 10,
    maxDurationSec: 65,
  },
  subtitle: {
    minCues: 3,
    maxCueLength: 100,    // characters
  },
}

// ─── FFmpeg Probe ───────────────────────────────────────────────────────

/**
 * Probe a video file with ffprobe to get stream metadata.
 *
 * @param {string} filePath - Absolute path to video file
 * @returns {Promise<{duration: number, width: number, height: number, hasAudio: boolean, videoCodec: string, audioCodec: string}>}
 */
const probeVideo = async (filePath) => {
  const ffmpegPath = await resolveFfmpegPath()
  if (!ffmpegPath) throw new Error("FFmpeg not found for probing")

  return new Promise((resolve, reject) => {
    const args = [
      "-v", "quiet",
      "-print_format", "json",
      "-show_format",
      "-show_streams",
      filePath,
    ]

    let stdout = ""
    let stderr = ""

    const proc = spawn(ffmpegPath.replace("ffmpeg", "ffprobe"), args)

    // If ffprobe doesn't exist as a separate binary, fall back to ffmpeg -i
    proc.on("error", () => {
      // Fallback: use ffmpeg -i to parse stderr
      const fallback = spawn(ffmpegPath, ["-i", filePath])
      let fallbackStderr = ""
      fallback.stderr.on("data", (d) => { fallbackStderr += d.toString() })
      fallback.on("close", () => {
        const durationMatch = fallbackStderr.match(/Duration: (\d+):(\d+):(\d+\.\d+)/)
        const videoMatch = fallbackStderr.match(/Video: (\w+)/)
        const audioMatch = fallbackStderr.match(/Audio: (\w+)/)
        const resMatch = fallbackStderr.match(/(\d{3,4})x(\d{3,4})/)

        if (!durationMatch) {
          return reject(new Error("Could not probe video"))
        }

        const duration = parseInt(durationMatch[1]) * 3600 + parseInt(durationMatch[2]) * 60 + parseFloat(durationMatch[3])
        resolve({
          duration,
          width: resMatch ? parseInt(resMatch[1]) : 0,
          height: resMatch ? parseInt(resMatch[2]) : 0,
          hasAudio: !!audioMatch,
          videoCodec: videoMatch?.[1] || "unknown",
          audioCodec: audioMatch?.[1] || "none",
        })
      })
      fallback.on("error", reject)
    })

    proc.stdout.on("data", (d) => { stdout += d.toString() })
    proc.stderr.on("data", (d) => { stderr += d.toString() })

    proc.on("close", (code) => {
      if (code !== 0) {
        return reject(new Error(`ffprobe failed with code ${code}`))
      }

      try {
        const probe = JSON.parse(stdout)
        const videoStream = probe.streams?.find((s) => s.codec_type === "video")
        const audioStream = probe.streams?.find((s) => s.codec_type === "audio")
        const duration = parseFloat(probe.format?.duration || "0")

        resolve({
          duration,
          width: videoStream?.width || 0,
          height: videoStream?.height || 0,
          hasAudio: !!audioStream,
          videoCodec: videoStream?.codec_name || "unknown",
          audioCodec: audioStream?.codec_name || "none",
        })
      } catch (parseErr) {
        reject(new Error(`Failed to parse ffprobe output: ${parseErr.message}`))
      }
    })
  })
}

// ─── Individual Checks ──────────────────────────────────────────────────

/**
 * Check video duration is within acceptable range.
 *
 * @param {number} durationSec
 * @returns {{name: string, passed: boolean, message: string}}
 */
const checkVideoDuration = (durationSec) => {
  const { minDurationSec, maxDurationSec } = THRESHOLDS.video
  const passed = durationSec >= minDurationSec && durationSec <= maxDurationSec
  return {
    name: "video_duration",
    passed,
    message: passed
      ? `Duration ${durationSec.toFixed(1)}s is within ${minDurationSec}-${maxDurationSec}s range`
      : `Duration ${durationSec.toFixed(1)}s is outside ${minDurationSec}-${maxDurationSec}s range`,
  }
}

/**
 * Check video resolution matches portrait 1080x1920.
 *
 * @param {number} width
 * @param {number} height
 * @returns {{name: string, passed: boolean, message: string}}
 */
const checkResolution = (width, height) => {
  const { expectedWidth, expectedHeight, tolerancePixels } = THRESHOLDS.video
  const widthOk = Math.abs(width - expectedWidth) <= tolerancePixels
  const heightOk = Math.abs(height - expectedHeight) <= tolerancePixels
  const passed = widthOk && heightOk

  return {
    name: "video_resolution",
    passed,
    message: passed
      ? `Resolution ${width}x${height} matches ${expectedWidth}x${expectedHeight}`
      : `Resolution ${width}x${height} does not match expected ${expectedWidth}x${expectedHeight}`,
  }
}

/**
 * Check audio stream exists and is valid.
 *
 * @param {boolean} hasAudio
 * @param {string} audioCodec
 * @returns {{name: string, passed: boolean, message: string}}
 */
const checkAudioStream = (hasAudio, audioCodec) => {
  const passed = hasAudio && audioCodec !== "none"
  return {
    name: "audio_stream",
    passed,
    message: passed
      ? `Audio stream present (${audioCodec})`
      : "No valid audio stream found",
  }
}

/**
 * Check audio duration matches video duration (sync).
 *
 * @param {number} videoDuration
 * @param {number} audioDuration
 * @param {number} [tolerance=2] - Max allowed difference in seconds
 * @returns {{name: string, passed: boolean, message: string}}
 */
const checkAudioSync = (videoDuration, audioDuration, tolerance = 2) => {
  const diff = Math.abs(videoDuration - audioDuration)
  const passed = diff <= tolerance
  return {
    name: "audio_sync",
    passed,
    message: passed
      ? `Audio and video synced (diff: ${diff.toFixed(2)}s)`
      : `Audio/video mismatch: ${diff.toFixed(2)}s difference (tolerance: ${tolerance}s)`,
  }
}

/**
 * Check subtitle file exists and has reasonable content.
 *
 * @param {string|null} subtitlePath
 * @returns {{name: string, passed: boolean, message: string}}
 */
const checkSubtitles = (subtitlePath) => {
  if (!subtitlePath || !fs.existsSync(subtitlePath)) {
    return {
      name: "subtitles",
      passed: false,
      message: "Subtitle file not found",
    }
  }

  const content = fs.readFileSync(subtitlePath, "utf-8")
  const cues = content.split(/\n\n+/).filter((c) => c.trim().length > 0)

  const { minCues, maxCueLength } = THRESHOLDS.subtitle
  const passed = cues.length >= minCues
  const hasLongCues = cues.some((c) => c.length > maxCueLength)

  return {
    name: "subtitles",
    passed,
    message: passed
      ? `${cues.length} subtitle cues found${hasLongCues ? " (some cues are long)" : ""}`
      : `Only ${cues.length} subtitle cues found (minimum: ${minCues})`,
  }
}

// ─── Main Quality Check ─────────────────────────────────────────────────

/**
 * Run all quality checks on a rendered video and its assets.
 *
 * @param {object} params
 * @param {string} params.videoPath - Absolute path to rendered video
 * @param {string|null} params.audioPath - Absolute path to original audio
 * @param {string|null} params.subtitlePath - Absolute path to SRT file
 * @returns {Promise<{passed: boolean, checks: Array<{name: string, passed: boolean, message: string}>, summary: string}>}
 */
export const runQualityChecks = async (params) => {
  const { videoPath, audioPath = null, subtitlePath = null } = params

  if (!videoPath || !fs.existsSync(videoPath)) {
    return {
      passed: false,
      checks: [{ name: "file_exists", passed: false, message: `Video file not found: ${videoPath}` }],
      summary: "Video file does not exist",
    }
  }

  const checks = []

  // ── Probe video ──────────────────────────────────────────────────
  let probe = null
  try {
    probe = await probeVideo(videoPath)
  } catch (err) {
    checks.push({ name: "video_probe", passed: false, message: `Probe failed: ${err.message}` })
    return { passed: false, checks, summary: "Could not probe video file" }
  }

  // ── Run checks ───────────────────────────────────────────────────
  checks.push(checkVideoDuration(probe.duration))
  checks.push(checkResolution(probe.width, probe.height))
  checks.push(checkAudioStream(probe.hasAudio, probe.audioCodec))

  // Audio sync check (if original audio available)
  if (audioPath && fs.existsSync(audioPath)) {
    try {
      const audioDuration = await getAudioDuration(audioPath)
      checks.push(checkAudioSync(probe.duration, audioDuration))
    } catch {
      checks.push({ name: "audio_sync", passed: false, message: "Could not determine audio duration for sync check" })
    }
  }

  // Subtitle check
  checks.push(checkSubtitles(subtitlePath))

  // ── Summary ──────────────────────────────────────────────────────
  const passed = checks.every((c) => c.passed)
  const failedChecks = checks.filter((c) => !c.passed)
  const summary = passed
    ? `All ${checks.length} quality checks passed`
    : `${failedChecks.length}/${checks.length} checks failed: ${failedChecks.map((c) => c.name).join(", ")}`

  log(passed ? "INFO" : "WARN", "Quality check complete", {
    passed,
    totalChecks: checks.length,
    failedChecks: failedChecks.map((c) => c.name),
  })

  return { passed, checks, summary }
}

/**
 * Get quality thresholds (for API / dashboard).
 */
export const getQualityThresholds = () => ({ ...THRESHOLDS })

export default {
  runQualityChecks,
  getQualityThresholds,
}
