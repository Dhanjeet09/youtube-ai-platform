/**
 * ImageKit Configuration
 *
 * Provides a configured ImageKit client for object storage.
 * Falls back gracefully when ImageKit is not configured (local development).
 *
 * Folder path conventions:
 *   autotube/audio/          — Generated TTS audio files (.mp3, .wav)
 *   autotube/videos/         — Downloaded stock videos (.mp4, .webm)
 *   autotube/final-videos/   — Rendered final output videos (.mp4)
 *   autotube/subtitles/      — Generated subtitle files (.srt, .vtt)
 *   autotube/thumbnails/     — Generated thumbnail images (.jpg, .png)
 */

import { log } from "../utils/logger.js"

let imagekit = null

/**
 * Get or initialise the ImageKit client.
 * Returns null if ImageKit is not configured.
 */
export const getImageKitClient = async () => {
  if (!isImageKitConfigured()) {
    return null
  }

  if (imagekit) return imagekit

  try {
    const { default: ImageKit } = await import("imagekit")
    imagekit = new ImageKit({
      publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
      privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
      urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT,
    })

    log("INFO", "[ImageKit] Client initialised", {
      urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT,
      publicKey: process.env.IMAGEKIT_PUBLIC_KEY
        ? process.env.IMAGEKIT_PUBLIC_KEY.slice(0, 6) + "..."
        : "not set",
    })

    return imagekit
  } catch (error) {
    log("ERROR", "[ImageKit] Failed to initialise client", { error: error.message })
    return null
  }
}

/**
 * Check whether ImageKit is enabled and configured.
 */
export const isImageKitConfigured = () => {
  return !!(
    process.env.IMAGEKIT_PUBLIC_KEY &&
    process.env.IMAGEKIT_PRIVATE_KEY &&
    process.env.IMAGEKIT_URL_ENDPOINT
  )
}

/**
 * Get the configured URL endpoint base.
 */
export const getImageKitUrlEndpoint = () => {
  return process.env.IMAGEKIT_URL_ENDPOINT || null
}

/**
 * Reset the client (useful for testing or config changes).
 */
export const resetImageKitClient = () => {
  imagekit = null
}

export default {
  getImageKitClient,
  isImageKitConfigured,
  getImageKitUrlEndpoint,
  resetImageKitClient,
}
