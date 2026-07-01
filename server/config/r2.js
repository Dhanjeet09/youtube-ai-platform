/**
 * Cloudflare R2 Configuration
 *
 * Provides a configured S3 client for Cloudflare R2 object storage.
 * Falls back gracefully when R2 is not configured (local development).
 *
 * R2 is S3-compatible, so we use the AWS SDK v3 for S3.
 * Bucket path conventions:
 *   audio/       — Generated TTS audio files (.mp3, .wav)
 *   videos/      — Downloaded stock videos (.mp4, .webm)
 *   final-videos/— Rendered final output videos (.mp4)
 *   subtitles/   — Generated subtitle files (.srt, .vtt)
 *   thumbnails/  — Generated thumbnail images (.jpg, .png)
 */

import { S3Client } from "@aws-sdk/client-s3"
import { log } from "../utils/logger.js"

const isR2Enabled = () => {
  return (
    process.env.R2_ENABLED !== "false" &&
    process.env.R2_ACCOUNT_ID &&
    process.env.R2_ACCESS_KEY_ID &&
    process.env.R2_SECRET_ACCESS_KEY
  )
}

let _client = null
let _bucketName = null
let _publicUrl = null

/**
 * Get or initialise the R2 S3 client.
 * Returns null if R2 is not configured.
 */
export const getR2Client = () => {
  if (!isR2Enabled()) {
    return null
  }

  if (_client) return _client

  const accountId = process.env.R2_ACCOUNT_ID
  _bucketName = process.env.R2_BUCKET_NAME || "autotube-assets"
  _publicUrl = process.env.R2_PUBLIC_URL || null

  _client = new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    },
    // Force path-style addressing for R2 compatibility
    forcePathStyle: true,
    // Max attempts for retry
    maxAttempts: 3,
  })

  log("INFO", "[R2] S3 client initialised", {
    bucket: _bucketName,
    accountId: accountId.slice(0, 6) + "...",
    publicUrl: _publicUrl || "not set (private)",
  })

  return _client
}

/**
 * Get the configured bucket name.
 */
export const getBucketName = () => {
  return _bucketName || process.env.R2_BUCKET_NAME || "autotube-assets"
}

/**
 * Get the optional public URL base for generating public URLs.
 * Example: https://assets.autotube.example.com
 */
export const getPublicUrl = () => {
  return _publicUrl || process.env.R2_PUBLIC_URL || null
}

/**
 * Check whether R2 is enabled and configured.
 */
export const isR2Configured = () => {
  return isR2Enabled()
}

/**
 * Reset the client (useful for testing or config changes).
 */
export const resetR2Client = () => {
  _client = null
  _bucketName = null
  _publicUrl = null
}

export default {
  getR2Client,
  getBucketName,
  getPublicUrl,
  isR2Configured,
  resetR2Client,
}
