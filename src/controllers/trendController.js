import { getTrends } from "../services/trendService.js"
import { generateScript } from "../services/scriptService.js"
import Script from "../models/Script.js"
import { logInfo, logError } from "../utils/logger.js"

export const generateScriptFromTrend = async (req, res) => {
  try {

    // 1️⃣ Get trending topics
    const trends = await getTrends()

    if (!trends || trends.length === 0) {
      logError("No trends found")
      return res.status(400).json({
        success: false,
        message: "No trends found"
      })
    }

    // 2️⃣ Pick first trend
    const topic = trends[0]

    logInfo(`Trend selected: ${topic}`)

    // 3️⃣ Generate script using AI
    const scriptContent = await generateScript(topic)

    if (!scriptContent) {
      throw new Error("AI returned empty script")
    }

    // 4️⃣ Save to MongoDB
    const savedScript = await Script.create({
      topic,
      content: scriptContent
    })

    logInfo("Script generated and saved successfully")

    // 5️⃣ Send response
    return res.status(200).json({
      success: true,
      data: savedScript
    })

  } catch (error) {

    // Log full error for debugging
    logError(`Script generation error: ${error.message}`)

    return res.status(500).json({
      success: false,
      message: "Script generation failed",
      ...(process.env.NODE_ENV === "development" && { error: error.message })
    })

  }
}