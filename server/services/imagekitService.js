/**
 * ImageKit Storage Service
 *
 * High-level service for interacting with ImageKit object storage.
 * All asset files (audio, video, subtitles, thumbnails) are stored
 * in ImageKit with organised folder paths.
 *
 * FOLDER PATH CONVENTIONS:
 *   autotube/audio/          — Generated TTS audio files (.mp3, .wav)
 *   autotube/videos/         — Downloaded stock videos (.mp4, .webm)
 *   autotube/final-videos/   — Rendered final output videos (.mp4)
 *   autotube/subtitles/      — Generated subtitle files (.srt, .vtt)
 *   autotube/thumbnails/     — Generated thumbnail images (.jpg, .png)
 *
 * FALLBACK BEHAVIOUR:
 * If ImageKit is not configured, all functions return null or empty results.
 * Each caller is responsible for falling back to local storage.
 */

import fs from "fs"
import path from "path"
import { log } from "../utils/logger.js"
import { getImageKitClient, isImageKitConfigured } from "../config/imagekit.js"

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

// ─── File Upload Security ─────────────────────────────────────────────
// Allowed extensions for ImageKit uploads
const ALLOWED_EXTENSIONS = new Set([
  ".mp3", ".wav", ".mp4", ".webm",
  ".srt", ".vtt",
  ".jpg", ".jpeg", ".png",
])

// Max file sizes by type (bytes)
const MAX_FILE_SIZES = {
  ".mp4": 500 * 1024 * 1024,  // 500 MB (video)
  ".webm": 500 * 1024 * 1024, // 500 MB (video)
  ".mp3": 50 * 1024 * 1024,   // 50 MB (audio)
  ".wav": 50 * 1024 * 1024,   // 50 MB (audio)
  ".jpg": 5 * 1024 * 1024,    // 5 MB (image)
  ".jpeg": 5 * 1024 * 1024,   // 5 MB (image)
  ".png": 5 * 1024 * 1024,    // 5 MB (image)
  ".srt": 1 * 1024 * 1024,    // 1 MB (subtitle)
  ".vtt": 1 * 1024 * 1024,    // 1 MB (subtitle)
}

/**
 * Validate file extension and size before upload.
 * @throws {Error} if validation fails
 */
const validateFileForUpload = (filePath) => {
  const ext = path.extname(filePath).toLowerCase()

  if (!ALLOWED_EXTENSIONS.has(ext)) {
    throw new Error(
      `[ImageKit] File type not allowed: ${ext}. Allowed: ${[...ALLOWED_EXTENSIONS].join(", ")}`
    )
  }

  const fileSize = fs.statSync(filePath).size
  const maxSize = MAX_FILE_SIZES[ext]
  if (maxSize && fileSize > maxSize) {
    const maxMB = (maxSize / (1024 * 1024)).toFixed(0)
    const actualMB = (fileSize / (1024 * 1024)).toFixed(2)
    throw new Error(
      `[ImageKit] File too large: ${actualMB}MB exceeds max ${maxMB}MB for ${ext} files`
    )
  }
}

const getContentType = (filePath) => {
  const ext = path.extname(filePath).toLowerCase()
  return MIME_TYPES[ext] || "application/octet-stream"
}

// ─── Helper: Check if ImageKit is available (log warning once) ────────
let _imagekitWarningLogged = false

const checkImageKitAvailable = () => {
  if (!isImageKitConfigured()) {
    if (!_imagekitWarningLogged) {
      log("WARN", "[ImageKit] ImageKit is not configured — set IMAGEKIT_PUBLIC_KEY, IMAGEKIT_PRIVATE_KEY, IMAGEKIT_URL_ENDPOINT")
      _imagekitWarningLogged = true
    }
    return false
  }
  return true
}

// ─── FOLDER_MAP ───────────────────────────────────────────────────────
const FOLDER_MAP = {
  audio: "autotube/audio",
  videos: "autotube/videos",
  "final-videos": "autotube/final-videos",
  finalVideo: "autotube/final-videos",
  subtitles: "autotube/subtitles",
  thumbnails: "autotube/thumbnails",
  thumbnail: "autotube/thumbnails",
}

/**
 * Upload a local file to ImageKit.
 *
 * @param {string} localFilePath - Absolute path to local file
 * @param {string} fileName - File name to use in ImageKit
 * @param {string} folder - Folder path (e.g. "autotube/audio")
 * @returns {Promise<{url: string, fileId: string, size: number, folder: string}|null>}
 */
export const uploadFile = async (localFilePath, fileName, folder) => {
  if (!checkImageKitAvailable()) return null

  const client = await getImageKitClient()
  if (!client) return null

  if (!fs.existsSync(localFilePath)) {
    throw new Error(`[ImageKit] Local file not found for upload: ${localFilePath}`)
  }

  // ── SECURITY: Validate file type and size before upload ──────────
  validateFileForUpload(localFilePath)

  // ── SECURITY: Sanitize fileName — strip path separators and null bytes ─
  const safeFileName = path.basename(fileName).replace(/[\x00\/\\]/g, "_")
  // Also validate the sanitized name isn't empty
  if (!safeFileName || safeFileName === "." || safeFileName === "..") {
    throw new Error("[ImageKit] Invalid file name after sanitization")
  }

  const mimeType = getContentType(localFilePath)
  const fileSize = fs.statSync(localFilePath).size

  log("INFO", `[ImageKit] Uploading ${folder}/${safeFileName}`, {
    size: `${(fileSize / 1024 / 1024).toFixed(2)}MB`,
    type: mimeType,
  })

  const fileBuffer = fs.readFileSync(localFilePath)

  try {
    const result = await client.upload({
      file: fileBuffer,
      fileName: safeFileName,
      folder: folder,
      contentType: mimeType,
      useUniqueFileName: false,
    })

    log("INFO", `[ImageKit] Upload complete: ${folder}/${safeFileName}`)

    return {
      url: result.url,
      fileId: result.fileId,
      size: fileSize,
      folder: folder,
    }
  } catch (error) {
    // SECURITY: Don't include raw error.message — it may contain credential info
    log("ERROR", `[ImageKit] Upload failed: ${folder}/${safeFileName}`, { error: error.message })
    throw new Error(`ImageKit upload failed for ${folder}/${safeFileName}`)
  }
}

/**
 * Delete a file from ImageKit by fileId.
 *
 * @param {string} fileId - ImageKit file ID to delete
 * @returns {Promise<boolean>} - true if deleted, false if not configured
 */
export const deleteFile = async (fileId) => {
  if (!checkImageKitAvailable()) return false

  const client = await getImageKitClient()
  if (!client) return false

  try {
    await client.deleteFile(fileId)
    log("INFO", `[ImageKit] Deleted file: ${fileId}`)
    return true
  } catch (error) {
    log("ERROR", `[ImageKit] Delete failed: ${fileId}`, { error: error.message })
    throw new Error(`ImageKit delete failed`)
  }
}

/**
 * List files in ImageKit under a given folder.
 *
 * @param {string} folder - Folder path (e.g. "autotube/audio")
 * @param {object} [options]
 * @param {number} [options.page=1] - Page number for pagination
 * @param {number} [options.limit=100] - Number of files per page
 * @returns {Promise<Array<{fileId: string, name: string, url: string, size: number, filePath: string, lastModified: Date}>|null>}
 */
export const listFiles = async (folder, options = {}) => {
  if (!checkImageKitAvailable()) return []

  const client = await getImageKitClient()
  if (!client) return []

  const { page = 1, limit = 100 } = options

  try {
    const result = await client.listFiles({
      path: folder,
      page: page,
      limit: limit,
      includeFolderPartitionMetadata: true,
    })

    const files = Array.isArray(result) ? result : (result?.files || [])

    return files
      .filter((item) => item.type === "file")
      .map((item) => ({
        fileId: item.fileId,
        name: item.name,
        url: item.url,
        size: item.size,
        filePath: item.filePath,
        lastModified: item.updatedAt || item.createdAt,
      }))
      .sort((a, b) => new Date(b.lastModified) - new Date(a.lastModified))
  } catch (error) {
    log("ERROR", `[ImageKit] List failed for folder: ${folder}`, { error: error.message })
    throw new Error(`ImageKit list failed`)
  }
}

/**
 * Generate a signed URL for temporary access to a private ImageKit file.
 *
 * @param {string} url - The ImageKit URL to sign
 * @param {number} [expiresIn=300] - Expiry in seconds (default: 5 minutes — kept short for security)
 * @returns {Promise<string|null>}
 */
export const getSignedUrl = async (url, expiresIn = 300) => {
  if (!checkImageKitAvailable()) return null

  const client = await getImageKitClient()
  if (!client) return null

  try {
    // ImageKit SDK: use getUrl with signed + expireInSeconds
    const signedUrl = client.getUrl({
      path: url,
      signed: true,
      expireInSeconds: expiresIn,
    })

    return signedUrl
  } catch (error) {
    log("ERROR", `[ImageKit] Signed URL generation failed`, { error: error.message })
    // SECURITY: Don't echo the URL back — it may contain sensitive path info
    throw new Error(`ImageKit signed URL generation failed`)
  }
}

/**
 * Generate a bucket path for a given asset type and filename.
 *
 * @param {string} type - Asset type: "audio", "videos", "final-videos", "subtitles", "thumbnails"
 * @param {string} filename - Filename with extension
 * @returns {{folder: string, fileName: string}} - ImageKit folder and file name
 */
export const getBucketPath = (type, filename) => {
  const folder = FOLDER_MAP[type] || `autotube/${type}`
  return { folder, fileName: filename }
}

/**
 * Delete all files under a given folder.
 *
 * @param {string} folder - Folder to delete (e.g. "autotube/audio")
 * @returns {Promise<number>} - Number of files deleted
 */
export const deleteFilesByFolder = async (folder) => {
  if (!checkImageKitAvailable()) return 0

  const files = await listFiles(folder)
  let deletedCount = 0

  for (const file of files) {
    try {
      await deleteFile(file.fileId)
      deletedCount++
    } catch (err) {
      log("WARN", `[ImageKit] Failed to delete ${file.fileId} during bulk delete`, {
        error: err.message,
      })
    }
  }

  log("INFO", `[ImageKit] Bulk delete complete for folder: ${folder}`, { deleted: deletedCount })
  return deletedCount
}

export default {
  uploadFile,
  deleteFile,
  listFiles,
  getSignedUrl,
  getBucketPath,
  deleteFilesByFolder,
}
