import { getEstimatedEarnings } from "./monetizationService.js"

const earningsHistory = new Map()

export const trackVideoEarnings = (videoId, niche, views = 0) => {
  const earnings = getEstimatedEarnings(views, niche)
  
  const existing = earningsHistory.get(videoId) || {}
  
  earningsHistory.set(videoId, {
    ...existing,
    videoId,
    niche,
    views,
    estimatedEarnings: earnings,
    lastUpdated: Date.now()
  })

  return earnings
}

export const updateVideoViews = (videoId, views) => {
  const video = earningsHistory.get(videoId)
  if (video) {
    const earnings = getEstimatedEarnings(views, video.niche)
    earningsHistory.set(videoId, {
      ...video,
      views,
      estimatedEarnings: earnings,
      lastUpdated: Date.now()
    })
  }
}

export const getTotalEarnings = () => {
  let total = 0
  let totalViews = 0
  let videoCount = 0

  for (const video of earningsHistory.values()) {
    total += video.estimatedEarnings?.estimated || 0
    totalViews += video.views || 0
    videoCount++
  }

  return {
    totalEstimated: Math.round(total * 100) / 100,
    totalViews,
    videoCount,
    averageRPM: videoCount > 0 ? Math.round((total / (totalViews / 1000)) * 100) / 100 : 0
  }
}

export const getEarningsReport = () => {
  const videos = Array.from(earningsHistory.values())
  const totals = getTotalEarnings()

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

export const clearEarningsHistory = () => {
  earningsHistory.clear()
}
