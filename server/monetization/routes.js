import express from "express"
import { getHighRpmNiches, getEstimatedEarnings, getAffiliateLinks } from "./monetizationService.js"
import { getEarningsReport, trackVideoEarnings } from "./earningsService.js"
import { generateAffiliateCTA } from "../seo/affiliateService.js"
import { asyncHandler } from "../middleware/asyncHandler.js"
import { log } from "../utils/logger.js"

const router = express.Router()

router.get("/", asyncHandler(async (req, res) => {
  const { type, niche, views } = req.query
  
  switch (type) {
    case "niches":
      return res.json({ success: true, data: getHighRpmNiches() })
    
    case "report":
      return res.json({ success: true, data: await getEarningsReport() })
    
    case "earnings":
      if (!niche || typeof niche !== "string" || !niche.trim()) {
        return res.status(400).json({ success: false, message: "niche is required and must be a non-empty string" })
      }
      if (niche.trim().length > 100) {
        return res.status(400).json({ success: false, message: "niche must not exceed 100 characters" })
      }
      return res.json({ 
        success: true, 
        data: getEstimatedEarnings(parseInt(views) || 100000, niche.trim()) 
      })
    
    case "cta":
      if (!niche || typeof niche !== "string" || !niche.trim()) {
        return res.status(400).json({ success: false, message: "niche is required and must be a non-empty string" })
      }
      if (niche.trim().length > 100) {
        return res.status(400).json({ success: false, message: "niche must not exceed 100 characters" })
      }
      return res.json({ success: true, data: generateAffiliateCTA(niche.trim()) })
    
    default:
      return res.json({ success: true, data: getHighRpmNiches() })
  }
}))

router.post("/", asyncHandler(async (req, res) => {
  const { videoId, niche, views } = req.body

  if (!videoId || typeof videoId !== "string" || !videoId.trim()) {
    return res.status(400).json({ success: false, message: "videoId is required and must be a non-empty string" })
  }
  if (videoId.trim().length > 50) {
    return res.status(400).json({ success: false, message: "videoId must not exceed 50 characters" })
  }

  if (!niche || typeof niche !== "string" || !niche.trim()) {
    return res.status(400).json({ success: false, message: "niche is required and must be a non-empty string" })
  }
  if (niche.trim().length > 100) {
    return res.status(400).json({ success: false, message: "niche must not exceed 100 characters" })
  }

  const result = await trackVideoEarnings(videoId.trim(), niche.trim(), parseInt(views) || 0)
  res.json({ success: true, data: result })
}))

/**
 * POST /api/monetization/strategy
 * Generate a monetization strategy for a given niche.
 */
router.post("/strategy", asyncHandler(async (req, res) => {
  const { niche } = req.body

  if (!niche || typeof niche !== "string" || !niche.trim()) {
    return res.status(400).json({ success: false, message: "niche is required and must be a non-empty string" })
  }

  const sanitizedNiche = niche.trim()
  const affiliates = getAffiliateLinks(sanitizedNiche)
  const earnings = getEstimatedEarnings(100000, sanitizedNiche)
  const ctaData = generateAffiliateCTA(sanitizedNiche)

  const strategy = {
    niche: sanitizedNiche,
    rpm: earnings.rpm,
    estimatedEarningsPer100k: earnings.estimated,
    breakdown: earnings.breakdown,
    affiliatePrograms: affiliates.map(a => ({
      name: a.name,
      url: a.url,
      commission: a.commission
    })),
    recommendations: [
      {
        type: "content",
        title: "Optimal Upload Frequency",
        description: "Upload 3-5 videos per week for maximum growth and revenue.",
        priority: "high"
      },
      {
        type: "timing",
        title: "Best Upload Times",
        description: "Upload between 10:00 AM - 2:00 PM IST for peak Indian audience engagement.",
        priority: "medium"
      },
      {
        type: "affiliate",
        title: "Affiliate Integration",
        description: affiliates.length > 0
          ? `Focus on ${affiliates[0]?.name} and ${affiliates[1]?.name || affiliates[0]?.name} as primary affiliate partners for ${sanitizedNiche}.`
          : `No affiliate programs available for ${sanitizedNiche}. Consider partnering with niche-relevant brands.`,
        priority: "high"
      },
      {
        type: "growth",
        title: "Shorts + Long-form Mix",
        description: "Use Shorts for discovery (60%) and Long-form for monetization (40%). Shorts drive subscribers; long-form drives ad revenue.",
        priority: "medium"
      }
    ],
    ctaTemplate: ctaData.voiceCTA || "Check the links in the description!",
    generatedAt: new Date().toISOString()
  }

  log("INFO", "Strategy generated", { niche: sanitizedNiche, rpm: earnings.rpm })

  res.json({ success: true, data: strategy })
}))

export default router
