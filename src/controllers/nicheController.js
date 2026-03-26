import { getBestNiche, getAllNicheStats, registerVideoPerformance, getNiches, getNicheHealth } from "../services/nicheService.js"

export const getBestNicheHandler = async (req, res, next) => {
  try {
    const result = await getBestNiche()

    res.json({
      success: true,
      data: result
    })
  } catch (error) {
    next(error)
  }
}

export const getNicheStatsHandler = async (req, res, next) => {
  try {
    const stats = getAllNicheStats()

    res.json({
      success: true,
      data: stats
    })
  } catch (error) {
    next(error)
  }
}

export const getAllNichesHandler = async (req, res, next) => {
  try {
    const niches = getNiches()

    res.json({
      success: true,
      data: niches
    })
  } catch (error) {
    next(error)
  }
}

export const registerPerformanceHandler = async (req, res, next) => {
  try {
    const { niche, videoId } = req.body

    if (!niche || !videoId) {
      return res.status(400).json({
        success: false,
        message: "niche and videoId are required"
      })
    }

    registerVideoPerformance(niche, videoId)

    res.json({
      success: true,
      message: `Registered video ${videoId} for niche ${niche}`
    })
  } catch (error) {
    next(error)
  }
}

export const getNicheHealthHandler = async (req, res, next) => {
  try {
    const health = getNicheHealth()

    res.json({
      success: true,
      data: health
    })
  } catch (error) {
    next(error)
  }
}
