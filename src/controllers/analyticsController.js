import { fetchVideoAnalytics, calculateViralScore, getViralScoreGrade } from "../services/analyticsService.js"

export const getAnalytics = async (req, res, next) => {
  try {
    const { videoId } = req.query

    if (!videoId) {
      return res.status(400).json({
        success: false,
        message: "videoId is required"
      })
    }

    const analytics = await fetchVideoAnalytics(videoId)
    const viralScore = calculateViralScore(analytics)
    const grade = getViralScoreGrade(viralScore)

    res.json({
      success: true,
      data: {
        videoId,
        ...analytics,
        viralScore,
        grade
      }
    })
  } catch (error) {
    next(error)
  }
}
