import axios from "axios"
import fs from "fs"
import path from "path"

const log = (level, message, data = {}) => {
  console.log(`[${level}] [VIDEO] ${message}`, Object.keys(data).length ? JSON.stringify(data) : "")
}

const videoCache = new Map()

const selectBestVideo = (videos) => {
  const validVideos = videos.filter(v => 
    v.video_files && 
    v.video_files.length > 0 &&
    v.image
  )

  if (validVideos.length === 0) {
    throw new Error("No valid videos found")
  }

  const shuffled = validVideos.sort(() => Math.random() - 0.5)
  const selected = shuffled[0]

  const sortedFiles = [...selected.video_files]
    .filter(f => f.link && f.height >= 720)
    .sort((a, b) => (b.height * b.width) - (a.height * a.width))

  if (sortedFiles.length === 0) {
    sortedFiles = [...selected.video_files].filter(f => f.link).sort((a, b) => (b.height * b.width) - (a.height * a.width))
  }

  return {
    url: sortedFiles[0]?.link,
    thumbnail: selected.image,
    duration: selected.duration,
    photographer: selected.user?.name || "Unknown"
  }
}

export const downloadStockVideo = async (query, options = {}) => {
  const { outputDir = "assets/generated/videos", perPage = 15 } = options

  if (!query || query.trim().length === 0) {
    throw new Error("Query is required")
  }

  const cacheKey = query.toLowerCase().trim()
  const cached = videoCache.get(cacheKey)
  if (cached && Date.now() - cached.timestamp < 3600000) {
    log("INFO", "Using cached video", { query })
    return cached.path
  }

  try {
    log("INFO", "Searching stock video", { query })

    const response = await axios.get(
      "https://api.pexels.com/videos/search",
      {
        headers: {
          Authorization: process.env.PEXELS_API_KEY,
        },
        params: {
          query,
          per_page: perPage,
          orientation: "portrait"
        },
        timeout: 15000
      }
    )

    const videos = response.data.videos

    if (!videos || !Array.isArray(videos) || videos.length === 0) {
      throw new Error(`No videos found for: ${query}`)
    }

    const selected = selectBestVideo(videos)

    if (!selected.url) {
      throw new Error("No downloadable video found")
    }

    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true })
    }

    const filename = `stock_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.mp4`
    const outputPath = path.join(outputDir, filename)

    log("INFO", "Downloading video", { 
      url: selected.url.slice(-50), 
      duration: selected.duration,
      photographer: selected.photographer
    })

    const videoStream = await axios({
      url: selected.url,
      method: "GET",
      responseType: "stream",
      timeout: 120000
    })

    const writer = fs.createWriteStream(outputPath)

    await new Promise((resolve, reject) => {
      videoStream.data.pipe(writer)
      writer.on("finish", resolve)
      writer.on("error", reject)
    })

    const fileSize = (fs.statSync(outputPath).size / 1024 / 1024).toFixed(2)
    log("INFO", "Video downloaded", { path: outputPath, size: `${fileSize}MB` })

    videoCache.set(cacheKey, { path: outputPath, timestamp: Date.now() })

    return outputPath

  } catch (error) {
    log("ERROR", "Download failed", { query, error: error.message })
    throw new Error(`Video download failed: ${error.message}`)
  }
}

export const clearVideoCache = () => {
  videoCache.clear()
  log("INFO", "Video cache cleared")
}
