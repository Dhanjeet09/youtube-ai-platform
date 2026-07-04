import { getTrends } from "../../trend/trendService.js"
import { log as logger } from "../../utils/logger.js"

const log = (level, message, data = {}) => logger(level, `[TOPIC] ${message}`, data)

/**
 * Topic service provides topic selection functionality.
 * Delegates to trend service for fetching trending topics.
 */

export const pickTopicFromNiche = async (niche) => {
  try {
    const trends = await getTrends({ niche, limit: 10 })
    if (!trends?.length) {
      return `${niche} Tips That Will Change Your Life`
    }
    const randomTrend = trends[Math.floor(Math.random() * trends.length)]
    return randomTrend.title
  } catch (error) {
    log("ERROR", "Trend fetch failed, using fallback", { niche, error: error.message })
    return `${niche} Tips That Will Change Your Life`
  }
}
