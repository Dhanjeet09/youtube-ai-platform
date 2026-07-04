/**
 * Asset Service — ImageKit-backed with local filesystem fallback
 *
 * All generated assets (audio, video, subtitles, thumbnails) are stored
 * in ImageKit in production, with a fallback to local disk for
 * development environments where ImageKit is not configured.
 *
 * FOLDER PATH CONVENTIONS:
 *   autotube/audio/          — Generated TTS audio files (.mp3, .wav)
 *   autotube/videos/         — Downloaded stock videos (.mp4, .webm)
 *   autotube/final-videos/   — Rendered final output videos (.mp4)
 *   autotube/subtitles/      — Generated subtitle files (.srt, .vtt)
 *   autotube/thumbnails/     — Generated thumbnail images (.jpg, .png)
 *
 * FALLBACK BEHAVIOUR:
 * When ImageKit is not configured, operations fall back to the local
 * filesystem under assets/generated/.
 */

import fs from "fs"
import { readdir, stat, access, unlink } from "fs/promises"
import path from "path"
import { fileURLToPath } from "url"
import { isImageKitConfigured } from "../config/imagekit.js"
import * as imagekitService from "../services/imagekitService.js"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// ─── Local Fallback Directory Structure ──────────────────────────────
const LOCAL_ASSET_DIRS = {
  audio: "assets/generated/audio",
  videos: "assets/generated/videos",
  final: "assets/generated/final-videos",
  subtitles: "assets/generated/subtitles",
  thumbnails: "assets/generated/thumbnails",
}

const ASSET_EXTENSIONS = {
  audio: [".mp3", ".wav"],
  videos: [".mp4", ".webm"],
  final: [".mp4", ".webm"],
  subtitles: [".srt", ".vtt"],
  thumbnails: [".jpg", ".jpeg", ".png"],
}

const IK_FOLDERS = {
  audio: "autotube/audio",
  videos: "autotube/videos",
  final: "autotube/final-videos",
  subtitles: "autotube/subtitles",
  thumbnails: "autotube/thumbnails",
}

// ─── Helpers ─────────────────────────────────────────────────────────

const formatSize = (bytes) => {
  if (bytes < 1024) return bytes + " B"
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB"
  return (bytes / (1024 * 1024)).toFixed(2) + " MB"
}

const matchesExtension = (name, extensions) => {
  if (!extensions || extensions.length === 0) return true
  const ext = path.extname(name).toLowerCase()
  return extensions.some((e) => e === ext)
}

// ─── ImageKit-Based Operations ───────────────────────────────────────

const getAssetsFromImageKit = async (folder, extensions) => {
  const files = await imagekitService.listFiles(folder)
  if (!files || files.length === 0) return []

  const result = []

  for (const file of files) {
    if (!matchesExtension(file.name, extensions)) continue
    result.push({
      name: file.name,
      key: file.filePath,
      path: file.filePath,
      url: file.url,
      size: file.size,
      sizeFormatted: formatSize(file.size),
      created: file.lastModified,
      modified: file.lastModified,
      storage: "imagekit",
    })
  }

  return result.sort((a, b) => new Date(b.modified) - new Date(a.modified))
}

const deleteAssetFromImageKit = async (filePath) => {
  if (filePath.includes("..")) {
    throw new Error("Invalid file path")
  }

  // For ImageKit we need to find the fileId; since we don't store it,
  // we delete by searching for the file by name
  const fileName = path.basename(filePath)
  const folder = path.dirname(filePath)

  const files = await imagekitService.listFiles(folder)
  const file = files.find((f) => f.name === fileName)

  if (!file) {
    throw new Error("File not found in ImageKit")
  }

  await imagekitService.deleteFile(file.fileId)
  return { success: true, path: filePath }
}

const deleteAssetsByFolderFromImageKit = async (folder) => {
  const count = await imagekitService.deleteFilesByFolder(folder)
  return { deleted: folder, count }
}

// ─── Local Filesystem Fallback Operations ────────────────────────────

const getFilesFromLocal = async (dir, extensions = []) => {
  try {
    await access(dir)
  } catch {
    return []
  }

  const entries = await readdir(dir, { withFileTypes: true })
  const files = entries
    .filter((f) => f.isFile())
    .filter((f) => extensions.length === 0 || extensions.some((ext) => f.name.endsWith(ext)))

  const result = []
  for (const f of files) {
    const fullPath = path.join(dir, f.name)
    const stats = await stat(fullPath)
    result.push({
      name: f.name,
      path: fullPath,
      key: null,
      size: stats.size,
      sizeFormatted: formatSize(stats.size),
      created: stats.birthtime,
      modified: stats.mtime,
      storage: "local",
    })
  }

  return result.sort((a, b) => new Date(b.modified) - new Date(a.modified))
}

/**
 * Get all assets, optionally combined from ImageKit and local storage.
 * Returns assets from ImageKit if configured, otherwise from local disk.
 */
export const getAllAssets = async () => {
  if (isImageKitConfigured()) {
    const [audio, videos, final, subtitles, thumbnails] = await Promise.all([
      getAssetsFromImageKit(IK_FOLDERS.audio, ASSET_EXTENSIONS.audio),
      getAssetsFromImageKit(IK_FOLDERS.videos, ASSET_EXTENSIONS.videos),
      getAssetsFromImageKit(IK_FOLDERS.final, ASSET_EXTENSIONS.final),
      getAssetsFromImageKit(IK_FOLDERS.subtitles, ASSET_EXTENSIONS.subtitles),
      getAssetsFromImageKit(IK_FOLDERS.thumbnails, ASSET_EXTENSIONS.thumbnails),
    ])

    const assets = { audio, videos, final, subtitles, thumbnails }
    assets.totalAudio = assets.audio.length
    assets.totalVideos = assets.videos.length
    assets.totalFinal = assets.final.length
    assets.totalSubtitles = assets.subtitles.length
    assets.totalThumbnails = assets.thumbnails.length
    assets.totalSize = [audio, videos, final].reduce(
      (acc, arr) => acc + arr.reduce((sum, f) => sum + f.size, 0),
      0
    )
    assets.totalSizeFormatted = formatSize(assets.totalSize)
    assets.storage = "imagekit"

    return assets
  }

  // Fallback: local filesystem
  const [audio, videos, final, subtitles, thumbnails] = await Promise.all([
    getFilesFromLocal(LOCAL_ASSET_DIRS.audio, ASSET_EXTENSIONS.audio),
    getFilesFromLocal(LOCAL_ASSET_DIRS.videos, ASSET_EXTENSIONS.videos),
    getFilesFromLocal(LOCAL_ASSET_DIRS.final, ASSET_EXTENSIONS.final),
    getFilesFromLocal(LOCAL_ASSET_DIRS.subtitles, ASSET_EXTENSIONS.subtitles),
    getFilesFromLocal(LOCAL_ASSET_DIRS.thumbnails, ASSET_EXTENSIONS.thumbnails),
  ])

  const assets = { audio, videos, final, subtitles, thumbnails }
  assets.totalAudio = assets.audio.length
  assets.totalVideos = assets.videos.length
  assets.totalFinal = assets.final.length
  assets.totalSubtitles = assets.subtitles.length
  assets.totalThumbnails = assets.thumbnails.length
  assets.totalSize = [audio, videos, final].reduce(
    (acc, arr) => acc + arr.reduce((sum, f) => sum + f.size, 0),
    0
  )
  assets.totalSizeFormatted = formatSize(assets.totalSize)
  assets.storage = "local"

  return assets
}

/**
 * Get assets by type.
 * @param {string} type - "audio", "videos", "final", "subtitles", "thumbnails"
 */
export const getAssetsByType = async (type) => {
  if (!LOCAL_ASSET_DIRS[type]) {
    throw new Error(`Invalid asset type: ${type}. Valid types: ${Object.keys(LOCAL_ASSET_DIRS).join(", ")}`)
  }

  if (isImageKitConfigured()) {
    return getAssetsFromImageKit(IK_FOLDERS[type], ASSET_EXTENSIONS[type])
  }

  return getFilesFromLocal(LOCAL_ASSET_DIRS[type], ASSET_EXTENSIONS[type])
}

/**
 * Delete a single asset by its path.
 * Accepts either a filesystem path (local) or an ImageKit file path.
 */
export const deleteAsset = async (filePath) => {
  if (isImageKitConfigured()) {
    // If it's an ImageKit path (starts with autotube/), delete from ImageKit
    if (filePath.startsWith("autotube/")) {
      return deleteAssetFromImageKit(filePath)
    }

    // If it looks like a local path, check if it matches an ImageKit file
    const basename = path.basename(filePath)
    for (const [type, folder] of Object.entries(IK_FOLDERS)) {
      const files = await imagekitService.listFiles(folder)
      const found = files.find((f) => f.name === basename)
      if (found) {
        await imagekitService.deleteFile(found.fileId)
        return { success: true, path: found.filePath }
      }
    }
    throw new Error("File not found in ImageKit")
  }

  // Local filesystem fallback
  const allowedDir = path.resolve("assets/generated")
  const resolvedPath = path.resolve(filePath)
  if (!resolvedPath.startsWith(allowedDir)) {
    throw new Error("Cannot delete files outside generated directory")
  }

  try {
    await access(resolvedPath)
  } catch {
    throw new Error("File not found")
  }

  await unlink(resolvedPath)
  return { success: true, path: resolvedPath }
}

// 🔴 Only delete known media file extensions
const ALLOWED_DELETE_EXTENSIONS = new Set([
  ".mp3", ".wav", ".mp4", ".webm", ".srt", ".vtt", ".jpg", ".png", ".jpeg", ".json",
])

/**
 * Delete all assets of a given type (or "all").
 */
export const deleteAllAssets = async (type) => {
  if (isImageKitConfigured()) {
    if (type === "all") {
      let totalDeleted = 0
      for (const folder of Object.values(IK_FOLDERS)) {
        const count = await imagekitService.deleteFilesByFolder(folder)
        totalDeleted += count
      }
      return { deleted: "all", count: totalDeleted }
    }

    const folder = IK_FOLDERS[type]
    if (!folder) throw new Error(`Invalid asset type: ${type}`)

    const count = await imagekitService.deleteFilesByFolder(folder)
    return { deleted: type, count }
  }

  // Local filesystem fallback
  const unlinkDir = async (dirPath) => {
    let count = 0
    try {
      await access(dirPath)
      const files = await readdir(dirPath)
      for (const f of files) {
        const ext = path.extname(f).toLowerCase()
        if (!ALLOWED_DELETE_EXTENSIONS.has(ext)) continue
        await unlink(path.join(dirPath, f))
        count++
      }
    } catch {
      /* dir doesn't exist */
    }
    return count
  }

  if (type === "all") {
    for (const dir of Object.values(LOCAL_ASSET_DIRS)) {
      await unlinkDir(dir)
    }
    return { deleted: "all" }
  }

  const dir = LOCAL_ASSET_DIRS[type]
  if (!dir) throw new Error(`Invalid asset type: ${type}`)

  const count = await unlinkDir(dir)
  return { deleted: type, count }
}

/**
 * Get asset statistics counts.
 */
export const getAssetStats = async () => {
  const assets = await getAllAssets()
  return {
    audio: assets.totalAudio,
    videos: assets.totalVideos,
    final: assets.totalFinal,
    subtitles: assets.totalSubtitles || 0,
    thumbnails: assets.totalThumbnails || 0,
    totalSize: assets.totalSizeFormatted,
    lastUpdated: assets.final[0]?.modified || null,
    storage: assets.storage,
  }
}
