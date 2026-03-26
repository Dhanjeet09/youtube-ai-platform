import cron from "node-cron"
import fs from "fs"
import { createVideoPipeline } from "./pipelineService.js"
import { uploadVideoToYouTube } from "./youtubeService.js"
import { registerVideoPerformance, updateNichePerformance } from "./nicheService.js"

const MAX_RETRIES = 3
const RETRY_DELAYS = [5000, 10000, 20000]

const log = (level, message, data = {}) => {
  const timestamp = new Date().toISOString()
  console.log(`[${level}] [SCHEDULER] ${timestamp} - ${message}`, Object.keys(data).length ? JSON.stringify(data) : "")
}

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms))

const uploadWithRetry = async (filePath, title, tags, retries = MAX_RETRIES) => {
  let lastError

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      log("INFO", `Upload attempt ${attempt}/${retries}`, { filePath: filePath.slice(-30) })

      const result = await uploadVideoToYouTube({
        filePath,
        title,
        description: title,
        tags,
        privacyStatus: "public"
      })

      log("INFO", "Upload successful", { videoId: result.id })
      return result

    } catch (error) {
      lastError = error
      log("WARN", `Attempt ${attempt} failed`, { error: error.message })

      if (attempt < retries) {
        const delay = RETRY_DELAYS[attempt - 1] || RETRY_DELAYS[RETRY_DELAYS.length - 1]
        log("INFO", `Retrying in ${delay / 1000}s...`)
        await sleep(delay)
      }
    }
  }

  throw new Error(`Upload failed after ${retries} attempts: ${lastError?.message}`)
}

const runJob = async (label) => {
  const startTime = Date.now()

  log("INFO", `[${label}] Job started`)

  try {
    log("INFO", "Running video pipeline")
    const result = await createVideoPipeline({ quality: "medium" })

    if (!result?.finalVideo) {
      throw new Error("Pipeline failed: finalVideo missing")
    }

    const filePath = result.finalVideo

    if (!fs.existsSync(filePath)) {
      throw new Error(`Video file not found: ${filePath}`)
    }

    const title = result.title || "AI Tools You Must Try 🔥"
    const tags = Array.isArray(result.tags) ? result.tags : ["AI", "Tech", "Shorts"]
    const niche = result.niche || "Tech"

    log("INFO", "Uploading video", { title, tags: tags.join(", ") })
    const upload = await uploadWithRetry(filePath, title, tags)

    registerVideoPerformance(niche, upload.id)
    log("INFO", "Video registered", { niche, videoId: upload.id })

    setTimeout(async () => {
      try {
        const update = await updateNichePerformance(niche, upload.id)
        log("INFO", "Analytics updated", { 
          videoId: upload.id, 
          viralScore: update.viralScore, 
          grade: update.grade 
        })
      } catch (err) {
        log("ERROR", "Analytics update failed (non-blocking)", { error: err.message })
      }
    }, 60000)

    const duration = ((Date.now() - startTime) / 1000).toFixed(2)
    log("INFO", `[${label}] Job completed`, {
      videoId: upload.id,
      duration: `${duration}s`
    })

    return {
      success: true,
      videoPath: filePath,
      title,
      tags,
      videoId: upload.id,
      niche,
      duration: `${duration}s`
    }

  } catch (error) {
    const duration = ((Date.now() - startTime) / 1000).toFixed(2)
    log("ERROR", `[${label}] Job failed`, {
      error: error.message,
      duration: `${duration}s`
    })
    throw error
  }
}

export const startScheduler = () => {
  if (process.env.SERVERLESS === "true") {
    log("INFO", "Running in serverless mode - scheduler disabled. Use POST /api/pipeline/run to trigger manually.")
    return
  }

  const tzOptions = { timezone: "Asia/Kolkata" }

  cron.schedule("0 10 * * *", () => runJob("MORNING").catch(() => {}), tzOptions)
  cron.schedule("0 14 * * *", () => runJob("AFTERNOON").catch(() => {}), tzOptions)
  cron.schedule("0 18 * * *", () => runJob("EVENING").catch(() => {}), tzOptions)

  log("INFO", "Scheduler started (10 AM, 2 PM, 6 PM IST)")
}

export { runJob }
