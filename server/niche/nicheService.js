import { fetchVideoAnalytics, calculateViralScore, getViralScoreGrade } from "../analytics/analyticsService.js"
import { getHighRpmNiches, getEstimatedEarnings } from "../monetization/monetizationService.js"
import { log as logger } from "../utils/logger.js"
import { NichePerformance } from "../database/models/index.js"

const HIGH_RPM_NICHES = ["Finance", "Business", "Technology", "Health", "RealEstate", "Education", "Sports", "WorldCup"]

// In-memory cache for fast reads (synced to MongoDB on writes)
const nicheCache = new Map()
let cacheLoaded = false

/**
 * Load all NichePerformance documents from MongoDB into the in-memory cache.
 */
const ensureCacheLoaded = async () => {
  if (cacheLoaded) return
  try {
    const all = await NichePerformance.find({})
      .limit(100)
      .lean()
    all.forEach(doc => {
      nicheCache.set(doc.niche, {
        videos: doc.videos || [],
        totalViralScore: doc.totalViralScore || 0,
        totalViews: doc.totalViews || 0,
        totalLikes: doc.totalLikes || 0,
        totalComments: doc.totalComments || 0,
        count: doc.videoCount || 0,
        lastUpdated: doc.updatedAt?.getTime() || Date.now()
      })
    })
    cacheLoaded = true
    log("INFO", "Loaded niche performance records into cache", { count: all.length })
  } catch (err) {
    log("ERROR", "Failed to load cache, will fall back to DB", { error: err.message })
  }
}

/**
 * Sync a single niche's cache entry to MongoDB.
 */
const syncNicheToDb = async (niche) => {
  const data = nicheCache.get(niche)
  if (!data) return
  // Keep only the most recent 500 videos to prevent unbounded document growth
  const recentVideos = (data.videos || [])
    .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
    .slice(0, 500)
  await NichePerformance.updateOne(
    { niche },
    {
      $set: {
        niche,
        videoCount: data.count,
        totalViralScore: data.totalViralScore,
        averageViralScore: data.count > 0 ? Math.round(data.totalViralScore / data.count) : 0,
        totalViews: data.totalViews || 0,
        totalLikes: data.totalLikes || 0,
        totalComments: data.totalComments || 0,
        videos: recentVideos
      }
    },
    { upsert: true }
  )
}

const log = (level, message, data = {}) => logger(level, `[NICHE] ${message}`, data)

export const registerVideoPerformance = async (niche, videoId) => {
  await ensureCacheLoaded()

  if (!HIGH_RPM_NICHES.includes(niche)) {
    throw new Error(`Invalid niche: ${niche}. Valid: ${HIGH_RPM_NICHES.join(", ")}`)
  }

  if (!nicheCache.has(niche)) {
    nicheCache.set(niche, {
      videos: [],
      totalViralScore: 0,
      totalViews: 0,
      totalLikes: 0,
      totalComments: 0,
      count: 0,
      lastUpdated: Date.now()
    })
  }

  const data = nicheCache.get(niche)

  const existingIndex = data.videos.findIndex(v => v.videoId === videoId)
  if (existingIndex >= 0) {
    data.videos[existingIndex].timestamp = Date.now()
    log("INFO", "Updated existing video", { niche, videoId })
  } else {
    data.videos.push({ videoId, timestamp: Date.now() })
    data.count++
  }

  // Sync to MongoDB
  await syncNicheToDb(niche)

  log("INFO", "Registered performance", { niche, videoId, count: data.count })
}

export const updateNichePerformance = async (niche, videoId) => {
  await ensureCacheLoaded()

  if (!HIGH_RPM_NICHES.includes(niche)) {
    throw new Error(`Invalid niche: ${niche}`)
  }

  const data = nicheCache.get(niche)
  if (!data) {
    throw new Error(`No data for niche: ${niche}`)
  }

  try {
    const analytics = await fetchVideoAnalytics(videoId)
    const viralScore = calculateViralScore(analytics)
    const grade = getViralScoreGrade(viralScore)
    const earnings = getEstimatedEarnings(analytics.views, niche)

    data.totalViralScore += viralScore
    data.totalViews += analytics.views || 0
    data.totalLikes += analytics.likes || 0
    data.totalComments += analytics.comments || 0
    data.lastUpdated = Date.now()

    // Sync to MongoDB
    await syncNicheToDb(niche)

    log("INFO", "Performance updated", {
      niche,
      videoId,
      viralScore,
      grade,
      estimatedEarnings: earnings.estimated,
      avg: getAverageViralScore(niche)
    })

    return { analytics, viralScore, grade, earnings }

  } catch (error) {
    log("ERROR", "Update failed", { niche, videoId, error: error.message })
    throw error
  }
}

export const getAverageViralScore = (niche) => {
  const data = nicheCache.get(niche)
  if (!data || data.count === 0) return 0
  return Math.round(data.totalViralScore / data.count)
}

export const getBestNiche = async () => {
  await ensureCacheLoaded()
  const scores = []

  for (const niche of HIGH_RPM_NICHES) {
    const avg = getAverageViralScore(niche)
    const data = nicheCache.get(niche)
    const earnings = getEstimatedEarnings(100000, niche)

    scores.push({
      niche,
      avg,
      count: data?.count || 0,
      lastUpdated: data?.lastUpdated,
      rpm: earnings.rpm
    })
  }

  scores.sort((a, b) => {
    if (a.count === 0 && b.count === 0) return b.rpm - a.rpm
    if (a.count === 0) return 1
    if (b.count === 0) return -1
    return b.avg - a.avg
  })

  const best = scores[0]
  log("INFO", "Best niche selected", {
    niche: best.niche,
    avg: best.avg,
    rpm: best.rpm,
    allScores: scores.map(s => `${s.niche}:${s.avg}`).join(", ")
  })

  return {
    niche: best.niche,
    averageViralScore: best.avg,
    videoCount: best.count,
    rpm: best.rpm
  }
}

export const getAllNicheStats = async () => {
  await ensureCacheLoaded()
  const rpmData = getHighRpmNiches()

  return HIGH_RPM_NICHES.map(nicheKey => {
    const data = nicheCache.get(nicheKey)
    const rpmInfo = rpmData.find(n => n.key === nicheKey) || {}

    return {
      niche: nicheKey,
      displayName: rpmInfo.name || nicheKey,
      videoCount: data?.count || 0,
      totalViralScore: data?.totalViralScore || 0,
      averageViralScore: getAverageViralScore(nicheKey),
      grade: getViralScoreGrade(getAverageViralScore(nicheKey)),
      rpm: rpmInfo.rpm || 5,
      lastUpdated: data?.lastUpdated || null
    }
  }).sort((a, b) => b.averageViralScore - a.averageViralScore)
}

export const getNiches = () => [...HIGH_RPM_NICHES]

export const getNicheHealth = async () => {
  const stats = await getAllNicheStats()
  const healthy = stats.filter(s => s.videoCount > 0 && s.averageViralScore >= 40)
  const needsData = stats.filter(s => s.videoCount === 0)

  return {
    healthyNiches: healthy.map(s => s.niche),
    needsData: needsData.map(s => s.niche),
    recommendation: healthy.length > 0
      ? `Stick with ${healthy[0].niche} (avg: ${healthy[0].averageViralScore}, RPM: ${healthy[0].rpm})`
      : "No data yet - recommend Finance (highest RPM)"
  }
}

export const getHighRpmNichesData = () => getHighRpmNiches()
