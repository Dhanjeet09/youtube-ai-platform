import { fetchVideoAnalytics, calculateViralScore, getViralScoreGrade } from "./analyticsService.js"
import { getHighRpmNiches, getEstimatedEarnings } from "./monetizationService.js"

const HIGH_RPM_NICHES = ["Finance", "Business", "Technology", "Health", "RealEstate", "Education"]

const nichePerformance = new Map()

const log = (level, message, data = {}) => {
  console.log(`[${level}] [NICHE] ${message}`, Object.keys(data).length ? JSON.stringify(data) : "")
}

export const registerVideoPerformance = (niche, videoId) => {
  if (!HIGH_RPM_NICHES.includes(niche)) {
    throw new Error(`Invalid niche: ${niche}. Valid: ${HIGH_RPM_NICHES.join(", ")}`)
  }

  if (!nichePerformance.has(niche)) {
    nichePerformance.set(niche, {
      videos: [],
      totalViralScore: 0,
      count: 0,
      lastUpdated: Date.now()
    })
  }

  const data = nichePerformance.get(niche)
  
  const existingIndex = data.videos.findIndex(v => v.videoId === videoId)
  if (existingIndex >= 0) {
    data.videos[existingIndex].timestamp = Date.now()
    log("INFO", "Updated existing video", { niche, videoId })
  } else {
    data.videos.push({ videoId, timestamp: Date.now() })
    data.count++
  }

  log("INFO", "Registered performance", { niche, videoId, count: data.count })
}

export const updateNichePerformance = async (niche, videoId) => {
  if (!HIGH_RPM_NICHES.includes(niche)) {
    throw new Error(`Invalid niche: ${niche}`)
  }

  const data = nichePerformance.get(niche)
  if (!data) {
    throw new Error(`No data for niche: ${niche}`)
  }

  try {
    const analytics = await fetchVideoAnalytics(videoId)
    const viralScore = calculateViralScore(analytics)
    const grade = getViralScoreGrade(viralScore)
    const earnings = getEstimatedEarnings(analytics.views, niche)

    data.totalViralScore += viralScore
    data.lastUpdated = Date.now()

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
  const data = nichePerformance.get(niche)
  if (!data || data.count === 0) return 0
  return Math.round(data.totalViralScore / data.count)
}

export const getBestNiche = async () => {
  const scores = []

  for (const niche of HIGH_RPM_NICHES) {
    const avg = getAverageViralScore(niche)
    const data = nichePerformance.get(niche)
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

export const getAllNicheStats = () => {
  const rpmData = getHighRpmNiches()
  
  return HIGH_RPM_NICHES.map(nicheKey => {
    const data = nichePerformance.get(nicheKey)
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

export const getNicheHealth = () => {
  const stats = getAllNicheStats()
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
