/**
 * Cloudflare R2 Storage Service
 *
 * High-level service for interacting with Cloudflare R2 (S3-compatible)
 * object storage. All asset files (audio, video, subtitles, thumbnails)
 * are stored in R2 with organised bucket paths.
 *
 * BUCKET PATH CONVENTIONS:
 *   audio/{filename}          — Generated TTS audio files (.mp3, .wav)
 *   videos/{filename}         — Downloaded stock videos (.mp4, .webm)
 *   final-videos/{filename}   — Rendered final output videos (.mp4)
 *   subtitles/{filename}      — Generated subtitle files (.srt, .vtt)
 *   thumbnails/{filename}     — Generated thumbnail images (.jpg, .png)
 *
 * FALLBACK BEHAVIOUR:
 * If R2 is not configured (R2_ENABLED=false or missing credentials),
 * all functions return null or empty results. Each caller is responsible
 * for falling back to local storage.
 */

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
  HeadObjectCommand,
} from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"
import { getR2Client, getBucketName, isR2Configured, getPublicUrl } from "../config/r2.js"
import fs from "fs"
import path from "path"
import { log } from "../utils/logger.js"

// ─── MIME Type Mapping ────────────────────────────────────────────────
const MIME_TYPES = {
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".srt": "text/plain; charset=utf-8",
  ".vtt": "text/vtt",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".json": "application/json",
}

const getContentType = (filePath) => {
  const ext = path.extname(filePath).toLowerCase()
  return MIME_TYPES[ext] || "application/octet-stream"
}

// ─── Cache Control ─────────────────────────────────────────────────────
const CACHE_CONTROL = {
  "audio/": "public, max-age=31536000, immutable",
  "video/": "public, max-age=31536000, immutable",
  "image/": "public, max-age=31536000, immutable",
  "text/": "public, max-age=86400",
  default: "public, max-age=86400",
}

const getCacheControl = (contentType) => {
  for (const [prefix, value] of Object.entries(CACHE_CONTROL)) {
    if (contentType.startsWith(prefix)) return value
  }
  return CACHE_CONTROL.default
}

// ─── Helper: Check if R2 is available (log warning once) ──────────────
let _r2WarningLogged = false

const checkR2Available = () => {
  if (!isR2Configured()) {
    if (!_r2WarningLogged) {
      log("WARN", "[R2] R2 is not configured — set R2_ENABLED=true and R2 credentials")
      _r2WarningLogged = true
    }
    return false
  }
  return true
}

// ─── Public URL Construction ───────────────────────────────────────────
const getPublicUrlForKey = (key) => {
  const base = getPublicUrl()
  if (!base) return null
  const normalizedBase = base.replace(/\/+$/, "")
  return `${normalizedBase}/${key}`
}

/**
 * Upload a local file to R2.
 *
 * @param {string} bucketPath - R2 key/path (e.g. "audio/file.mp3")
 * @param {string} localFilePath - Absolute path to local file
 * @param {string} [contentType] - MIME type (auto-detected if omitted)
 * @param {object} [options] - Additional upload options
 * @param {boolean} [options.deleteLocalAfter] - Delete local file after successful upload
 * @returns {Promise<{key: string, url: string|null, size: number}|null>}
 */
export const uploadFile = async (bucketPath, localFilePath, contentType, options = {}) => {
  if (!checkR2Available()) return null
  const client = getR2Client()
  const bucket = getBucketName()

  if (!fs.existsSync(localFilePath)) {
    throw new Error(`[R2] Local file not found for upload: ${localFilePath}`)
  }

  const mimeType = contentType || getContentType(localFilePath)
  const cacheControl = getCacheControl(mimeType)
  const fileSize = fs.statSync(localFilePath).size

  log("INFO", `[R2] Uploading ${bucketPath}`, {
    size: `${(fileSize / 1024 / 1024).toFixed(2)}MB`,
    type: mimeType,
    bucket,
  })

  const fileStream = fs.createReadStream(localFilePath)

  try {
    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: bucketPath,
      Body: fileStream,
      ContentType: mimeType,
      CacheControl: cacheControl,
    })

    await client.send(command)

    const publicUrl = getPublicUrlForKey(bucketPath)
    log("INFO", `[R2] Upload complete: ${bucketPath}`)

    // Optionally delete local file after successful upload
    if (options.deleteLocalAfter) {
      try {
        fs.unlinkSync(localFilePath)
        log("INFO", `[R2] Local file deleted after upload: ${localFilePath}`)
      } catch (cleanupErr) {
        log("WARN", `[R2] Failed to clean up local file: ${cleanupErr.message}`)
      }
    }

    return {
      key: bucketPath,
      url: publicUrl,
      size: fileSize,
    }
  } catch (error) {
    log("ERROR", `[R2] Upload failed: ${bucketPath}`, { error: error.message })
    throw new Error(`R2 upload failed for ${bucketPath}: ${error.message}`)
  } finally {
    fileStream.destroy()
  }
}

/**
 * Upload a buffer directly to R2.
 *
 * @param {string} bucketPath - R2 key/path
 * @param {Buffer} buffer - File content buffer
 * @param {string} contentType - MIME type
 * @returns {Promise<{key: string, url: string|null, size: number}|null>}
 */
export const uploadBuffer = async (bucketPath, buffer, contentType) => {
  if (!checkR2Available()) return null
  const client = getR2Client()
  const bucket = getBucketName()

  const mimeType = contentType || "application/octet-stream"
  const cacheControl = getCacheControl(mimeType)

  log("INFO", `[R2] Uploading buffer to ${bucketPath}`, {
    size: `${(buffer.length / 1024).toFixed(2)}KB`,
    type: mimeType,
  })

  try {
    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: bucketPath,
      Body: buffer,
      ContentType: mimeType,
      CacheControl: cacheControl,
    })

    await client.send(command)
    const publicUrl = getPublicUrlForKey(bucketPath)

    log("INFO", `[R2] Buffer upload complete: ${bucketPath}`)
    return {
      key: bucketPath,
      url: publicUrl,
      size: buffer.length,
    }
  } catch (error) {
    log("ERROR", `[R2] Buffer upload failed: ${bucketPath}`, { error: error.message })
    throw new Error(`R2 buffer upload failed for ${bucketPath}: ${error.message}`)
  }
}

/**
 * Delete a file from R2.
 *
 * @param {string} bucketPath - R2 key/path to delete
 * @returns {Promise<boolean>} - true if deleted, false if not configured
 */
export const deleteFile = async (bucketPath) => {
  if (!checkR2Available()) return false
  const client = getR2Client()
  const bucket = getBucketName()

  try {
    const command = new DeleteObjectCommand({
      Bucket: bucket,
      Key: bucketPath,
    })
    await client.send(command)
    log("INFO", `[R2] Deleted: ${bucketPath}`)
    return true
  } catch (error) {
    log("ERROR", `[R2] Delete failed: ${bucketPath}`, { error: error.message })
    throw new Error(`R2 delete failed for ${bucketPath}: ${error.message}`)
  }
}

/**
 * List files in R2 under a given prefix (directory).
 *
 * @param {string} [prefix=""] - Prefix to filter by (e.g. "audio/", "videos/")
 * @param {object} [options]
 * @param {number} [options.maxKeys=1000] - Maximum keys to return
 * @returns {Promise<Array<{key: string, size: number, lastModified: Date, etag: string}>>}
 */
export const listFiles = async (prefix = "", options = {}) => {
  if (!checkR2Available()) return []
  const client = getR2Client()
  const bucket = getBucketName()
  const { maxKeys = 1000 } = options

  try {
    const command = new ListObjectsV2Command({
      Bucket: bucket,
      Prefix: prefix,
      MaxKeys: maxKeys,
    })

    const response = await client.send(command)
    const contents = response.Contents || []

    return contents
      .filter((item) => item.Key && !item.Key.endsWith("/")) // exclude "directory" markers
      .map((item) => ({
        key: item.Key,
        size: item.Size,
        lastModified: item.LastModified,
        etag: item.ETag,
      }))
      .sort((a, b) => new Date(b.lastModified) - new Date(a.lastModified))
  } catch (error) {
    log("ERROR", `[R2] List failed for prefix: ${prefix}`, { error: error.message })
    throw new Error(`R2 list failed: ${error.message}`)
  }
}

/**
 * Generate a signed URL for temporary access to a private R2 object.
 *
 * @param {string} bucketPath - R2 key/path
 * @param {number} [expiresIn=3600] - Expiry in seconds (max 86400 for thumbnails, 3600 for video)
 * @returns {Promise<string|null>}
 */
export const getSignedUrl = async (bucketPath, expiresIn = 3600) => {
  if (!checkR2Available()) return null
  const client = getR2Client()
  const bucket = getBucketName()

  try {
    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: bucketPath,
    })

    const signedUrl = await getSignedUrl(client, command, { expiresIn })
    return signedUrl
  } catch (error) {
    log("ERROR", `[R2] Signed URL generation failed: ${bucketPath}`, { error: error.message })
    throw new Error(`R2 signed URL failed: ${error.message}`)
  }
}

/**
 * Check if a file exists in R2.
 *
 * @param {string} bucketPath - R2 key/path
 * @returns {Promise<boolean>}
 */
export const fileExists = async (bucketPath) => {
  if (!checkR2Available()) return false
  const client = getR2Client()
  const bucket = getBucketName()

  try {
    const command = new HeadObjectCommand({
      Bucket: bucket,
      Key: bucketPath,
    })
    await client.send(command)
    return true
  } catch (error) {
    if (error.name === "NotFound" || error.$metadata?.httpStatusCode === 404) {
      return false
    }
    log("ERROR", `[R2] HeadObject failed: ${bucketPath}`, { error: error.message })
    throw error
  }
}

/**
 * Get a readable stream for an R2 object (for proxying to HTTP responses).
 *
 * @param {string} bucketPath - R2 key/path
 * @returns {Promise<{stream: ReadableStream, contentType: string, contentLength: number, lastModified: Date}|null>}
 */
export const getFileStream = async (bucketPath) => {
  if (!checkR2Available()) return null
  const client = getR2Client()
  const bucket = getBucketName()

  try {
    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: bucketPath,
    })

    const response = await client.send(command)

    return {
      stream: response.Body,
      contentType: response.ContentType || getContentType(bucketPath),
      contentLength: response.ContentLength,
      lastModified: response.LastModified,
      etag: response.ETag,
    }
  } catch (error) {
    if (error.name === "NotFound" || error.$metadata?.httpStatusCode === 404) {
      return null
    }
    log("ERROR", `[R2] GetObject failed: ${bucketPath}`, { error: error.message })
    throw error
  }
}

/**
 * Delete all files under a given prefix.
 *
 * @param {string} prefix - Prefix to delete (e.g. "audio/")
 * @returns {Promise<number>} - Number of files deleted
 */
export const deleteFilesByPrefix = async (prefix) => {
  if (!checkR2Available()) return 0
  const client = getR2Client()
  const bucket = getBucketName()

  const files = await listFiles(prefix)
  let deletedCount = 0

  for (const file of files) {
    try {
      await deleteFile(file.key)
      deletedCount++
    } catch (err) {
      log("WARN", `[R2] Failed to delete ${file.key} during bulk delete`, {
        error: err.message,
      })
    }
  }

  log("INFO", `[R2] Bulk delete complete for prefix: ${prefix}`, { deleted: deletedCount })
  return deletedCount
}

/**
 * Get file metadata (size, lastModified, contentType) from R2.
 *
 * @param {string} bucketPath - R2 key/path
 * @returns {Promise<{key: string, size: number, lastModified: Date, contentType: string}|null>}
 */
export const getFileInfo = async (bucketPath) => {
  if (!checkR2Available()) return null
  const client = getR2Client()
  const bucket = getBucketName()

  try {
    const command = new HeadObjectCommand({
      Bucket: bucket,
      Key: bucketPath,
    })
    const response = await client.send(command)

    return {
      key: bucketPath,
      size: response.ContentLength,
      lastModified: response.LastModified,
      contentType: response.ContentType,
      etag: response.ETag,
    }
  } catch (error) {
    if (error.name === "NotFound" || error.$metadata?.httpStatusCode === 404) {
      return null
    }
    log("ERROR", `[R2] GetFileInfo failed: ${bucketPath}`, { error: error.message })
    throw error
  }
}

/**
 * Generate a bucket path for a given asset type and filename.
 *
 * @param {string} type - Asset type: "audio", "videos", "final-videos", "subtitles", "thumbnails"
 * @param {string} filename - Filename with extension
 * @returns {string} - R2 bucket path
 */
export const getBucketPath = (type, filename) => {
  const prefixMap = {
    audio: "audio",
    videos: "videos",
    "final-videos": "final-videos",
    finalVideo: "final-videos",
    subtitles: "subtitles",
    thumbnails: "thumbnails",
    thumbnail: "thumbnails",
  }

  const prefix = prefixMap[type] || type
  return `${prefix}/${filename}`
}

export default {
  uploadFile,
  uploadBuffer,
  deleteFile,
  listFiles,
  getSignedUrl,
  fileExists,
  getFileStream,
  deleteFilesByPrefix,
  getFileInfo,
  getBucketPath,
}
