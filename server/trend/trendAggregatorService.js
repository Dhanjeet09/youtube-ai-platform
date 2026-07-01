import yts from "youtube-search-api"
import { MatchEvent } from "../database/models/index.js"
import { log as logger } from "../utils/logger.js"

const log = (level, message, data = {}) => logger(level, `[TREND-AGGREGATOR] ${message}`, data)

const matchDataCache = new Map()
const CACHE_TTL_MS = 6 * 60 * 60 * 1000
const MAX_CACHE_SIZE = 500

const getCachedMatchData = (key) => {
  const cached = matchDataCache.get(key)
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data
  }
  return null
}

const setCachedMatchData = (key, data) => {
  // Enforce max cache size: delete oldest if at capacity
  if (matchDataCache.size >= MAX_CACHE_SIZE) {
    const oldestKey = matchDataCache.keys().next().value
    matchDataCache.delete(oldestKey)
  }
  matchDataCache.set(key, { data, timestamp: Date.now() })
}

const getUpcomingMatches = async () => {
  const cacheKey = "upcoming_matches"
  const cached = getCachedMatchData(cacheKey)
  if (cached) return cached

  try {
    const matches = await MatchEvent.find({ status: "scheduled" })
      .sort({ kickoffTime: 1 })
      .limit(5)
      .lean()

    if (matches.length > 0) {
      setCachedMatchData(cacheKey, matches)
      return matches
    }
    return []
  } catch (error) {
    log("WARN", "Failed to fetch upcoming matches", { error: error.message })
    return []
  }
}

const getRecentFinishedMatches = async () => {
  const cacheKey = "finished_matches"
  const cached = getCachedMatchData(cacheKey)
  if (cached) return cached

  try {
    const matches = await MatchEvent.find({ status: "finished" })
      .sort({ finishedTime: -1 })
      .limit(5)
      .lean()

    if (matches.length > 0) {
      setCachedMatchData(cacheKey, matches)
      return matches
    }
    return []
  } catch (error) {
    log("WARN", "Failed to fetch finished matches", { error: error.message })
    return []
  }
}

const searchYouTubeTrends = async (query, limit = 5) => {
  try {
    const res = await yts.GetListByKeyword(query, false, limit)
    const items = (res.items || [])
      .filter(v => v && v.title && v.title.length > 5)
      .slice(0, limit)

    return items.map(v => ({
      title: v.title,
      videoId: v.videoId,
      thumbnail: v.thumbnail?.thumbnails?.[0]?.url
    }))
  } catch (error) {
    log("WARN", "YouTube trends search failed", { query, error: error.message })
    return []
  }
}

const FOOTBALL_KEYWORDS = [
  "world cup football",
  "football highlights",
  "best goals football",
  "football skills",
  "viral football moments"
]

const FOOTBALL_NEWS_KEYWORDS = [
  "football news",
  "world cup updates",
  "transfer news football"
]

const FAN_DISCUSSIONS_KEYWORDS = [
  "football fan reactions",
  "world cup prediction",
  "who will win world cup"
]

const HISTORICAL_WORLD_CUP_FACTS = [
  "Brazil won the World Cup 5 times - more than any other nation",
  "Miroslav Klose holds the record for most World Cup goals (16)",
  "The fastest goal in World Cup history was scored by Hakan Sukur in 11 seconds",
  "Italy's 2006 World Cup win was their 4th title",
  "The 1950 World Cup final had a crowd of 199,854 - the largest ever"
]

export const getTrendingTopic = async (options = {}) => {
  log("INFO", "Aggregating trending topics", { options })

  try {
    const upcoming = await getUpcomingMatches()
    if (upcoming.length > 0) {
      const match = upcoming[0]
      const topic = `${match.team1} vs ${match.team2} - Match Preview & Prediction`
      log("INFO", "Selected upcoming match topic", { topic })
      return {
        topic,
        category: "match-preview",
        urgencyScore: 85,
        publishWindow: "pre-match",
        confidence: 0.9
      }
    }

    const finished = await getRecentFinishedMatches()
    if (finished.length > 0) {
      const match = finished[0]
      const topic = `${match.team1} ${match.score1} - ${match.score2} ${match.team2} - Match Highlights & Analysis`
      log("INFO", "Selected finished match topic", { topic })
      return {
        topic,
        category: "match-result",
        urgencyScore: 90,
        publishWindow: "post-match",
        confidence: 0.95,
        matchData: match
      }
    }

    const footballTrends = await searchYouTubeTrends(
      FOOTBALL_KEYWORDS[Math.floor(Math.random() * FOOTBALL_KEYWORDS.length)],
      5
    )
    if (footballTrends.length > 0) {
      const trend = footballTrends[Math.floor(Math.random() * footballTrends.length)]
      log("INFO", "Selected viral football story", { topic: trend.title })
      return {
        topic: trend.title,
        category: "top-moments",
        urgencyScore: 70,
        publishWindow: "daily",
        confidence: 0.7,
        sourceVideoId: trend.videoId
      }
    }

    const newsTrends = await searchYouTubeTrends(
      FOOTBALL_NEWS_KEYWORDS[Math.floor(Math.random() * FOOTBALL_NEWS_KEYWORDS.length)],
      3
    )
    if (newsTrends.length > 0) {
      const trend = newsTrends[Math.floor(Math.random() * newsTrends.length)]
      log("INFO", "Selected football news", { topic: trend.title })
      return {
        topic: trend.title,
        category: "match-prediction",
        urgencyScore: 60,
        publishWindow: "daily",
        confidence: 0.6,
        sourceVideoId: trend.videoId
      }
    }

    const fanTrends = await searchYouTubeTrends(
      FAN_DISCUSSIONS_KEYWORDS[Math.floor(Math.random() * FAN_DISCUSSIONS_KEYWORDS.length)],
      3
    )
    if (fanTrends.length > 0) {
      const trend = fanTrends[Math.floor(Math.random() * fanTrends.length)]
      log("INFO", "Selected fan discussion topic", { topic: trend.title })
      return {
        topic: trend.title,
        category: "debate",
        urgencyScore: 50,
        publishWindow: "weekly",
        confidence: 0.5,
        sourceVideoId: trend.videoId
      }
    }

    const historicalFact = HISTORICAL_WORLD_CUP_FACTS[
      Math.floor(Math.random() * HISTORICAL_WORLD_CUP_FACTS.length)
    ]
    log("INFO", "Selected historical fact", { topic: historicalFact })
    return {
      topic: historicalFact,
      category: "player-fact",
      urgencyScore: 30,
      publishWindow: "weekly",
      confidence: 0.4
    }

  } catch (error) {
    log("ERROR", "Topic aggregation failed", { error: error.message })
    throw new Error(`Trend aggregation failed: ${error.message}`)
  }
}

export const clearMatchCache = () => {
  matchDataCache.clear()
  log("INFO", "Match data cache cleared")
}
