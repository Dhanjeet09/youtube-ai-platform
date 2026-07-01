import { getEstimatedEarnings } from "../monetization/monetizationService.js"
import { EarningsRecord } from "../database/models/index.js"
import { log as logger } from "../utils/logger.js"

const log = (level, message, data = {}) => logger(level, `[EARNINGS] ${message}`, data)

// In-memory cache for fast reads (synced to MongoDB on writes)
const earningsCache = new Map()
const EARNINGS_TTL_MS = 24 * 60 * 60 * 1000
const MAX_EARNINGS_SIZE = 5000

// Store interval reference for cleanup on shutdown
let _cacheCleanupInterval = null

// Periodic cleanup of stale cache entries
_cacheCleanupInterval = setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of earningsCache) {
    const lastUpd = entry.lastUpdated ? new Date(entry.lastUpdated).getTime() : 0
    if (now - lastUpd > EARNINGS_TTL_MS) {
      earningsCache.delete(key)
    }
  }
  if (earningsCache.size > MAX_EARNINGS_SIZE) {
    const entries = [...earningsCache.entries()]
      .sort((a, b) => new Date(a[1].lastUpdated).getTime() - new Date(b[1].lastUpdated).getTime())
    const toDelete = entries.slice(0, entries.length - MAX_EARNINGS_SIZE)
    for (const [key] of toDelete) {
      earningsCache.delete(key)
    }
  }
}, 30 * 60 * 1000)

// Load all earnings records into cache on startup
let cacheInitialized = false
const ensureCacheLoaded = async () => {
  if (cacheInitialized) return
  try {
    const all = await EarningsRecord.find({})
      .sort({ lastUpdated: -1 })
      .limit(MAX_EARNINGS_SIZE)
      .lean()
    all.forEach(record => {
      earningsCache.set(record.videoId, record)
    })
    cacheInitialized = true
    log("INFO", "Loaded earnings records into cache", { count: all.length })
  } catch (err) {
    log("ERROR", "Failed to load cache", { error: err.message })
    // Allow fallback to DB queries
  }
}

export const trackVideoEarnings = async (videoId, niche, views = 0) => {
  await ensureCacheLoaded()
  const earnings = getEstimatedEarnings(views, niche)

  const data = {
    videoId,
    niche,
    views,
    estimatedEarnings: earnings,
    lastUpdated: new Date()
  }

  // Persist to MongoDB
  await EarningsRecord.updateOne({ videoId }, { $set: data }, { upsert: true })

  // Update cache
  earningsCache.set(videoId, { ...data })

  return earnings
}

export const updateVideoViews = async (videoId, views) => {
  await ensureCacheLoaded()
  const video = earningsCache.get(videoId)
  if (video) {
    const earnings = getEstimatedEarnings(views, video.niche)
    const data = {
      ...video,
      views,
      estimatedEarnings: earnings,
      lastUpdated: new Date()
    }

    // Persist to MongoDB
    await EarningsRecord.updateOne({ videoId }, { $set: data }, { upsert: true })

    // Update cache
    earningsCache.set(videoId, { ...data })
  }
}

export const getTotalEarnings = async () => {
  await ensureCacheLoaded()

  const result = await EarningsRecord.aggregate([
    {
      $group: {
        _id: "$niche",
        totalViews: { $sum: "$views" },
        totalEarnings: { $sum: "$estimatedEarnings.breakdown.ads" }
      }
    }
  ])

  let total = 0
  let totalViews = 0
  let videoCount = 0

  // Use cache for videoCount (aggregation gives per-niche breakdown)
  for (const video of earningsCache.values()) {
    total += video.estimatedEarnings?.estimated || 0
    totalViews += video.views || 0
    videoCount++
  }

  // If cache is empty, fall back to aggregation counts
  if (videoCount === 0) {
    totalViews = result.reduce((sum, r) => sum + (r.totalViews || 0), 0)
    total = result.reduce((sum, r) => sum + (r.totalEarnings || 0), 0)
    videoCount = result.reduce((sum, r) => sum + 1, 0)
  }

  return {
    totalEstimated: Math.round(total * 100) / 100,
    totalViews,
    videoCount,
    averageRPM: videoCount > 0 ? Math.round((total / (totalViews / 1000)) * 100) / 100 : 0,
    byNiche: result
  }
}

export const getEarningsReport = async () => {
  await ensureCacheLoaded()
  const videos = Array.from(earningsCache.values())
  const totals = await getTotalEarnings()

  return {
    summary: totals,
    videos: videos.sort((a, b) => (b.views || 0) - (a.views || 0)),
    projections: {
      monthly: totals.totalEstimated * 30,
      yearly: totals.totalEstimated * 365,
      at100kViews: (totals.averageRPM || 10) * 100,
      at1mViews: (totals.averageRPM || 10) * 1000
    }
  }
}

export const clearEarningsHistory = async () => {
  await EarningsRecord.deleteMany({})
  earningsCache.clear()
}

export const cleanupEarningsCache = () => {
  if (_cacheCleanupInterval) {
    clearInterval(_cacheCleanupInterval)
    _cacheCleanupInterval = null
  }
  earningsCache.clear()
}
