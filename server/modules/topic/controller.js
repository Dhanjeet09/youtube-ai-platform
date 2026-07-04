import { pickTopicFromNiche } from "./service.js"
import { getAvailableNiches } from "../../trend/trendService.js"

/**
 * GET /api/topics
 * Returns trending topics for a given niche, or lists available niches.
 */
export const getTopics = async (req, res, next) => {
  try {
    const { niche, type } = req.query

    if (type === "niches") {
      return res.json({ success: true, data: getAvailableNiches() })
    }

    const topic = await pickTopicFromNiche(niche || "Finance")
    res.json({ success: true, data: { topic, niche: niche || "Finance" } })
  } catch (error) {
    next(error)
  }
}
