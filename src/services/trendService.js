import googleTrends from "google-trends-api"
import { logError, logInfo } from "../utils/logger.js"

const fallbackTopics = [
  "AI tools",
  "ChatGPT tips",
  "JavaScript tricks",
  "Tech facts",
  "Coding hacks"
]

export const getTrends = async () => {
  try {
    const result = await googleTrends.dailyTrends({
      geo: "IN",
      timeout: 10000
    })

    // Remove Google's anti-XSSI prefix
    const cleaned = result.replace(/^\)\]\}',?\n/, "")

    const parsed = JSON.parse(cleaned)

    const days = parsed?.default?.trendingSearchesDays

    if (!days || days.length === 0) {
      throw new Error("No trending data available")
    }

    const trendingSearches = days[0].trendingSearches
    if (!Array.isArray(trendingSearches) || trendingSearches.length === 0) {
      throw new Error("No trending searches available")
    }

    const trends = trendingSearches
      .filter(t => t?.title?.query)
      .map(t => t.title.query)
      .slice(0, 10)

    logInfo(`Fetched ${trends.length} trends from Google Trends`)

    return trends
  } catch (error) {

    logError(`Trend fetch failed: ${error.message}`)

    logInfo("Using fallback topics")

    return fallbackTopics
  }
}