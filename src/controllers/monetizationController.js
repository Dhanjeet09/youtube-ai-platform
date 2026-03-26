import { getHighRpmNiches, getEstimatedEarnings } from "../services/monetizationService.js"
import { getEarningsReport, trackVideoEarnings, updateVideoViews } from "../services/earningsService.js"
import { generateAffiliateCTA, generateVideoDescription, generatePinnedComment } from "../services/affiliateService.js"
import { generateSEOContent, getTrendingKeywords } from "../services/seoService.js"

export const getNichesData = async (req, res, next) => {
  try {
    const niches = getHighRpmNiches()
    res.json({ success: true, data: niches })
  } catch (error) {
    next(error)
  }
}

export const getEarningsEstimate = async (req, res, next) => {
  try {
    const { views = 100000, niche } = req.query
    const earnings = getEstimatedEarnings(parseInt(views), niche)
    res.json({ success: true, data: earnings })
  } catch (error) {
    next(error)
  }
}

export const getEarningsReportHandler = async (req, res, next) => {
  try {
    const report = getEarningsReport()
    res.json({ success: true, data: report })
  } catch (error) {
    next(error)
  }
}

export const trackVideoHandler = async (req, res, next) => {
  try {
    const { videoId, niche, views = 0 } = req.body
    if (!videoId || !niche) {
      return res.status(400).json({ success: false, message: "videoId and niche required" })
    }
    const earnings = trackVideoEarnings(videoId, niche, parseInt(views))
    res.json({ success: true, data: earnings })
  } catch (error) {
    next(error)
  }
}

export const getAffiliateCTA = async (req, res, next) => {
  try {
    const { niche } = req.query
    if (!niche) {
      return res.status(400).json({ success: false, message: "niche required" })
    }
    const cta = generateAffiliateCTA(niche)
    res.json({ success: true, data: cta })
  } catch (error) {
    next(error)
  }
}

export const getVideoDescription = async (req, res, next) => {
  try {
    const { script, title, tags, niche } = req.body
    if (!script || !title) {
      return res.status(400).json({ success: false, message: "script and title required" })
    }
    const description = generateVideoDescription(script, title, tags || [], niche || "General")
    res.json({ success: true, data: description })
  } catch (error) {
    next(error)
  }
}

export const getSEOContent = async (req, res, next) => {
  try {
    const { topic, niche } = req.body
    if (!topic) {
      return res.status(400).json({ success: false, message: "topic required" })
    }
    const seo = await generateSEOContent(topic, niche || "General")
    res.json({ success: true, data: seo })
  } catch (error) {
    next(error)
  }
}

export const getKeywords = async (req, res, next) => {
  try {
    const { niche } = req.query
    const keywords = await getTrendingKeywords(niche || "Finance")
    res.json({ success: true, data: keywords })
  } catch (error) {
    next(error)
  }
}
