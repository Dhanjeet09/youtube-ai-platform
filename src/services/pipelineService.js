import { getTrends } from "./trendService.js"
import { generateScript } from "./scriptService.js"
import { generateVoice } from "./voiceService.js"
import { downloadStockVideo } from "./videoService.js"
import { renderVideo } from "./renderService.js"
import { generateMetadata } from "./metadataService.js"
import { getBestNiche, getNiches } from "./nicheService.js"
import { uploadVideoToYouTube } from "./youtubeService.js"
import fs from "fs"

const log = (level, message, data = {}) => {
  const timestamp = new Date().toISOString()
  console.log(`[${level}] [PIPELINE] ${timestamp} - ${message}`, Object.keys(data).length ? JSON.stringify(data) : "")
}

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms))

const retry = async (fn, name, maxRetries = 2) => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      log("WARN", `${name} attempt ${attempt} failed`, { error: error.message })
      if (attempt < maxRetries) {
        await sleep(2000 * attempt)
      } else {
        throw error
      }
    }
  }
}

const isYouTubeAuthenticated = () => {
  return fs.existsSync("youtube-token.json")
}

const generateVideoDescription = (script, title, tags, niche) => {
  const ctaText = niche === "Finance" || niche === "Business" 
    ? "\n\n🔗 Links & Resources in Description\n\n💰 Invest Wisely!"
    : "\n\n🔗 Follow for more content!"
  
  return `${title}\n\n📌 About this video:\n${script.slice(0, 500)}...\n\n${ctaText}\n\n${tags.map(t => `#${t.replace(/\s+/g, '')}`).join(' ')}`
}

export const createVideoPipeline = async (options = {}) => {
  const { forceNiche, quality = "medium" } = options

  log("INFO", "Pipeline started")

  const startTime = Date.now()

  try {
    let topic, niche

    if (forceNiche && getNiches().includes(forceNiche)) {
      niche = forceNiche
      topic = await pickTopicFromNiche(niche)
      log("INFO", "Using forced niche", { niche, topic })
    } else {
      const bestNicheResult = await getBestNiche()
      niche = bestNicheResult.niche
      topic = await pickTopicFromNiche(niche)
      log("INFO", "Auto-selected best niche", { niche, avgScore: bestNicheResult.averageViralScore })
    }

    log("INFO", "Generating script...")
    const script = await retry(() => generateScript(topic, { niche }), "Generate script")
    log("INFO", "Script ready", { wordCount: script.split(/\s+/).length })

    const [metadata, voicePromise, videoPromise] = await Promise.all([
      retry(() => generateMetadata(script), "Generate metadata"),
      retry(() => generateVoice(script), "Generate voice"),
      retry(() => downloadStockVideo(topic), "Download stock video")
    ])

    const [audioPath, videoPath] = await Promise.all([voicePromise, videoPromise])
    log("INFO", "Assets ready", { audio: !!audioPath, video: !!videoPath })

    log("INFO", "Rendering video...")
    const finalVideo = await retry(
      () => renderVideo(audioPath, videoPath, script, { quality }),
      "Render video"
    )

    const duration = ((Date.now() - startTime) / 1000).toFixed(2)
    log("INFO", "Pipeline completed", { duration: `${duration}s`, finalVideo })

    return {
      topic,
      niche,
      script,
      title: metadata.title,
      tags: metadata.tags,
      audio: audioPath,
      stockVideo: videoPath,
      finalVideo,
      metadata,
      description: generateVideoDescription(script, metadata.title, metadata.tags, niche)
    }

  } catch (error) {
    log("ERROR", "Pipeline failed", { error: error.message, stack: error.stack })
    throw error
  }
}

const pickTopicFromNiche = async (niche) => {
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

export const runFullPipeline = async (options = {}) => {
  const result = await createVideoPipeline(options)
  
  let videoId = null
  let uploaded = false

  if (isYouTubeAuthenticated()) {
    try {
      log("INFO", "Uploading to YouTube...")
      const uploadResult = await uploadVideoToYouTube({
        filePath: result.finalVideo,
        title: result.title,
        description: result.description,
        tags: result.tags,
        privacyStatus: "public"
      })
      videoId = uploadResult.id
      uploaded = true
      log("INFO", "Upload successful", { videoId })
    } catch (error) {
      log("ERROR", "Upload failed, video saved locally", { error: error.message })
    }
  } else {
    log("WARN", "YouTube not authenticated, video saved locally")
  }
  
  return {
    videoPath: result.finalVideo,
    title: result.title,
    description: result.description,
    tags: result.tags,
    videoId,
    uploaded,
    niche: result.niche,
    topic: result.topic,
    message: uploaded 
      ? "Video uploaded successfully!" 
      : "Video created locally (YouTube upload pending - connect account in Settings)"
  }
}
