/**
 * Asset Service — R2-backed with local filesystem fallback
 *
 * All generated assets (audio, video, subtitles, thumbnails) are stored
 * in Cloudflare R2 in production, with a fallback to local disk for
 * development environments where R2 is not configured.
 *
 * BUCKET PATH CONVENTIONS:
 *   audio/{filename}          — Generated TTS audio files (.mp3, .wav)
 *   videos/{filename}         — Downloaded stock videos (.mp4, .webm)
 *   final-videos/{filename}   — Rendered final output videos (.mp4)
 *   subtitles/{filename}      — Generated subtitle files (.srt, .vtt)
 *   thumbnails/{filename}     — Generated thumbnail images (.jpg, .png)
 *
 * FALLBACK BEHAVIOUR:
 * When R2 is not configured (R2_ENABLED=false or missing credentials),
 * operations fall back to the local filesystem under assets/generated/.
 */

import fs from "fs"
import { readdir, stat, access, unlink } from "fs/promises"
import path from "path"
import { fileURLToPath } from "url"
import { isR2Configured } from "../config/r2.js"
import * as r2Service from "../services/r2Service.js"

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

const R2_PREFIXES = {
  audio: "audio",
  videos: "videos",
  final: "final-videos",
  subtitles: "subtitles",
  thumbnails: "thumbnails",
}

// ─── Helpers ─────────────────────────────────────────────────────────

const formatSize = (bytes) => {
  if (bytes < 1024) return bytes + " B"
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB"
  return (bytes / (1024 * 1024)).toFixed(2) + " MB"
}

const getAssetTypeFromR2Key = (key) => {
  for (const [type, prefix] of Object.entries(R2_PREFIXES)) {
    if (key.startsWith(prefix + "/")) return type
  }
  return null
}

const getNameFromR2Key = (key) => {
  return path.basename(key)
}

const matchesExtension = (name, extensions) => {
  if (!extensions || extensions.length === 0) return true
  const ext = path.extname(name).toLowerCase()
  return extensions.some((e) => e === ext)
}

// ─── R2-Based Operations ────────────────────────────────────────────

const getAssetsFromR2 = async (prefix, extensions) => {
  const files = await r2Service.listFiles(prefix)
  const result = []

  for (const file of files) {
    if (!matchesExtension(file.key, extensions)) continue
    result.push({
      name: getNameFromR2Key(file.key),
      key: file.key,
      path: file.key,
      size: file.size,
      sizeFormatted: formatSize(file.size),
      created: file.lastModified,
      modified: file.lastModified,
      storage: "r2",
    })
  }

  return result.sort((a, b) => new Date(b.modified) - new Date(a.modified))
}

const deleteAssetFromR2 = async (key) => {
  // Security: validate the key doesn't try path traversal
  if (key.includes("..")) {
    throw new Error("Invalid key path")
  }

  const exists = await r2Service.fileExists(key)
  if (!exists) {
    throw new Error("File not found in R2")
  }

  await r2Service.deleteFile(key)
  return { success: true, path: key }
}

const deleteAssetsByPrefixFromR2 = async (prefix) => {
  const count = await r2Service.deleteFilesByPrefix(prefix)
  return { deleted: prefix, count }
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
 * Get all assets, optionally combined from R2 and local storage.
 * Returns assets from R2 if configured, otherwise from local disk.
 * In migration mode (R2 configured but local assets exist), both are returned.
 */
export const getAllAssets = async () => {
  if (isR2Configured()) {
    const [audio, videos, final, subtitles, thumbnails] = await Promise.all([
      getAssetsFromR2(R2_PREFIXES.audio, ASSET_EXTENSIONS.audio),
      getAssetsFromR2(R2_PREFIXES.videos, ASSET_EXTENSIONS.videos),
      getAssetsFromR2(R2_PREFIXES.final, ASSET_EXTENSIONS.final),
      getAssetsFromR2(R2_PREFIXES.subtitles, ASSET_EXTENSIONS.subtitles),
      getAssetsFromR2(R2_PREFIXES.thumbnails, ASSET_EXTENSIONS.thumbnails),
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
    assets.storage = "r2"

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

  if (isR2Configured()) {
    return getAssetsFromR2(R2_PREFIXES[type], ASSET_EXTENSIONS[type])
  }

  return getFilesFromLocal(LOCAL_ASSET_DIRS[type], ASSET_EXTENSIONS[type])
}

/**
 * Delete a single asset by its path/key.
 * Accepts either a filesystem path (local) or an R2 key (e.g. "audio/file.mp3").
 */
export const deleteAsset = async (filePath) => {
  if (isR2Configured()) {
    // If it's an R2 key (starts with a known prefix), delete from R2
    if (Object.values(R2_PREFIXES).some((p) => filePath.startsWith(p))) {
      return deleteAssetFromR2(filePath)
    }

    // If it looks like a local path, check if it's an R2 key by basename
    // Try to find it in R2 by constructing the key from type + basename
    const basename = path.basename(filePath)
    for (const [type, prefix] of Object.entries(R2_PREFIXES)) {
      const key = `${prefix}/${basename}`
      const exists = await r2Service.fileExists(key)
      if (exists) {
        return deleteAssetFromR2(key)
      }
    }
    throw new Error("File not found in R2")
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
  if (isR2Configured()) {
    if (type === "all") {
      let totalDeleted = 0
      for (const prefix of Object.values(R2_PREFIXES)) {
        const count = await r2Service.deleteFilesByPrefix(prefix)
        totalDeleted += count
      }
      return { deleted: "all", count: totalDeleted }
    }

    const prefix = R2_PREFIXES[type]
    if (!prefix) throw new Error(`Invalid asset type: ${type}`)

    const count = await r2Service.deleteFilesByPrefix(prefix)
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
