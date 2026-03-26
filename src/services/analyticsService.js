import { youtube } from "../config/youtube.js"

const analyticsCache = new Map()
const CACHE_TTL_MS = 5 * 60 * 1000

const log = (level, message, data = {}) => {
  console.log(`[${level}] [ANALYTICS] ${message}`, Object.keys(data).length ? JSON.stringify(data) : "")
}

const getCached = (videoId) => {
  const cached = analyticsCache.get(videoId)
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data
  }
  return null
}

const setCache = (videoId, data) => {
  analyticsCache.set(videoId, { data, timestamp: Date.now() })
}

export const fetchVideoAnalytics = async (videoId) => {
  if (!videoId) {
    throw new Error("videoId is required")
  }

  if (typeof videoId !== "string" || videoId.trim().length === 0) {
    throw new Error("Invalid videoId format")
  }

  const cached = getCached(videoId)
  if (cached) {
    log("INFO", "Cache hit", { videoId })
    return cached
  }

  try {
    const response = await youtube.videos.list({
      id: videoId,
      part: "statistics,snippet"
    })

    const video = response.data.items?.[0]

    if (!video) {
      throw new Error(`Video not found: ${videoId}`)
    }

    const stats = video.statistics
    const snippet = video.snippet

    const result = {
      views: parseInt(stats.viewCount) || 0,
      likes: parseInt(stats.likeCount) || 0,
      comments: parseInt(stats.commentCount) || 0,
      favorites: parseInt(stats.favoriteCount) || 0,
      title: snippet?.title || "",
      publishedAt: snippet?.publishedAt || ""
    }

    setCache(videoId, result)
    log("INFO", "Fetched analytics", { videoId, views: result.views })

    return result

  } catch (error) {
    log("ERROR", "Failed to fetch", { videoId, error: error.message })
    throw new Error(`Failed to fetch analytics: ${error.message}`)
  }
}

export const calculateViralScore = (analytics) => {
  const { views, likes, comments } = analytics

  if (!views || views === 0) {
    return 0
  }

  const likesRatio = (likes / views) * 100
  const commentsRatio = (comments / views) * 100

  const viewsScore = Math.min((views / 10000) * 60, 60)
  const likesScore = Math.min(likesRatio * 5, 30)
  const commentsScore = Math.min(commentsRatio * 5, 10)

  const rawScore = viewsScore + likesScore + commentsScore
  const normalizedScore = Math.min(Math.round(rawScore), 100)

  return normalizedScore
}

export const getViralScoreGrade = (score) => {
  if (score >= 80) return "VIRAL"
  if (score >= 60) return "HIGH"
  if (score >= 40) return "MEDIUM"
  if (score >= 20) return "LOW"
  return "MINIMAL"
}

export const clearAnalyticsCache = (videoId) => {
  if (videoId) {
    analyticsCache.delete(videoId)
  } else {
    analyticsCache.clear()
  }
}
