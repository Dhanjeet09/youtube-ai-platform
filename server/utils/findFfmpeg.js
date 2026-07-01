/**
 * Shared FFmpeg path resolution utility.
 * Tries system PATH first, then common locations, then falls back to ffmpeg-static.
 * Used by renderService.js and getAudioDuration.js to ensure consistent FFmpeg resolution.
 */
import { access as accessAsync } from "fs/promises"
import path from "path"

let cachedFfmpegPath = null

/**
 * Resolve the FFmpeg binary path using a fallback chain:
 *   1. System PATH
 *   2. Common installation paths
 *   3. ffmpeg-static package
 * Returns the full path to the FFmpeg binary, or null if not found.
 */
export const resolveFfmpegPath = async () => {
  if (cachedFfmpegPath) return cachedFfmpegPath

  const isWin = process.platform === "win32"
  const cmd = isWin ? "ffmpeg.exe" : "ffmpeg"

  // 1. System PATH
  const pathDirs = (process.env.PATH || "").split(path.delimiter)
  for (const dir of pathDirs) {
    try {
      const p = path.join(dir, cmd)
      await accessAsync(p)
      cachedFfmpegPath = p
      return p
    } catch { /* not in this path */ }
  }

  // 2. Common installation locations
  const commonPaths = isWin
    ? [
        "C:\\ffmpeg\\bin\\ffmpeg.exe",
        "C:\\Program Files\\ffmpeg\\bin\\ffmpeg.exe",
        "C:\\Program Files (x86)\\ffmpeg\\bin\\ffmpeg.exe",
      ]
    : [
        "/usr/bin/ffmpeg",
        "/usr/local/bin/ffmpeg",
        "/opt/homebrew/bin/ffmpeg",
      ]

  for (const p of commonPaths) {
    try {
      await accessAsync(p)
      cachedFfmpegPath = p
      return p
    } catch { /* not found */ }
  }

  // 3. ffmpeg-static fallback
  try {
    const ffmpegStatic = await import("ffmpeg-static")
    const staticPath = ffmpegStatic.default || ffmpegStatic.path || ffmpegStatic
    if (staticPath) {
      cachedFfmpegPath = staticPath
      return staticPath
    }
  } catch { /* not available */ }

  return null
}

/**
 * Reset the cached FFmpeg path (useful for testing or re-detection).
 */
export const resetFfmpegCache = () => {
  cachedFfmpegPath = null
}
