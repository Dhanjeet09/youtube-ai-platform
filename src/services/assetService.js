import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const ASSET_DIRS = {
  audio: "assets/generated/audio",
  videos: "assets/generated/videos",
  final: "assets/generated/final-videos",
  subtitles: "assets/generated/subtitles"
}

const getFiles = (dir, extensions = []) => {
  if (!fs.existsSync(dir)) return []
  
  const files = fs.readdirSync(dir, { withFileTypes: true })
  return files
    .filter(f => f.isFile())
    .filter(f => extensions.length === 0 || extensions.some(ext => f.name.endsWith(ext)))
    .map(f => {
      const fullPath = path.join(dir, f.name)
      const stats = fs.statSync(fullPath)
      return {
        name: f.name,
        path: fullPath,
        size: stats.size,
        sizeFormatted: formatSize(stats.size),
        created: stats.birthtime,
        modified: stats.mtime
      }
    })
    .sort((a, b) => new Date(b.modified) - new Date(a.modified))
}

const formatSize = (bytes) => {
  if (bytes < 1024) return bytes + " B"
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB"
  return (bytes / (1024 * 1024)).toFixed(2) + " MB"
}

export const getAllAssets = () => {
  const assets = {
    audio: getFiles(ASSET_DIRS.audio, [".mp3", ".wav"]),
    videos: getFiles(ASSET_DIRS.videos, [".mp4", ".webm"]),
    final: getFiles(ASSET_DIRS.final, [".mp4", ".webm"]),
    subtitles: getFiles(ASSET_DIRS.subtitles, [".srt", ".vtt"])
  }

  assets.totalAudio = assets.audio.length
  assets.totalVideos = assets.videos.length
  assets.totalFinal = assets.final.length
  assets.totalSize = [...assets.audio, ...assets.videos, ...assets.final]
    .reduce((acc, f) => acc + f.size, 0)
  assets.totalSizeFormatted = formatSize(assets.totalSize)

  return assets
}

export const getAssetsByType = (type) => {
  const dir = ASSET_DIRS[type]
  if (!dir) throw new Error(`Invalid asset type: ${type}`)
  
  const extensions = {
    audio: [".mp3", ".wav"],
    videos: [".mp4", ".webm"],
    final: [".mp4", ".webm"],
    subtitles: [".srt", ".vtt"]
  }
  
  return getFiles(dir, extensions[type] || [])
}

export const deleteAsset = (filePath) => {
  if (!fs.existsSync(filePath)) {
    throw new Error("File not found")
  }
  
  const normalized = path.normalize(filePath)
  if (!normalized.includes("assets/generated")) {
    throw new Error("Cannot delete files outside generated directory")
  }
  
  fs.unlinkSync(normalized)
  return { success: true, path: normalized }
}

export const deleteAllAssets = (type) => {
  if (type === "all") {
    for (const dir of Object.values(ASSET_DIRS)) {
      if (fs.existsSync(dir)) {
        fs.readdirSync(dir).forEach(f => {
          fs.unlinkSync(path.join(dir, f))
        })
      }
    }
    return { deleted: "all" }
  }
  
  const dir = ASSET_DIRS[type]
  if (!dir) throw new Error(`Invalid asset type: ${type}`)
  
  let count = 0
  if (fs.existsSync(dir)) {
    fs.readdirSync(dir).forEach(f => {
      fs.unlinkSync(path.join(dir, f))
      count++
    })
  }
  
  return { deleted: type, count }
}

export const getAssetStats = () => {
  const assets = getAllAssets()
  return {
    audio: assets.totalAudio,
    videos: assets.totalVideos,
    final: assets.totalFinal,
    totalSize: assets.totalSizeFormatted,
    lastUpdated: assets.final[0]?.modified || null
  }
}
