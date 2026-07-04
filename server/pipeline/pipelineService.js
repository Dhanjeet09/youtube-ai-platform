import { getTrends } from "../trend/trendService.js"
import { generateScript } from "../modules/script/service.js"
import { generateVoice } from "../modules/audio/service.js"
import { downloadStockVideo } from "../modules/video/service.js"
import { renderVideo } from "./renderService.js"
import { generateMetadata } from "../modules/metadata/service.js"
import { getBestNiche, getNiches } from "../niche/nicheService.js"
import { uploadVideoToYouTube } from "../modules/upload/service.js"
import { getTrendingTopic } from "../trend/trendAggregatorService.js"
import { retryWithBackoff } from "../utils/retry.js"
import { log as logger } from "../utils/logger.js"
import { isYouTubeAuthenticated } from "../utils/youtubeAuth.js"
import { MatchEvent, ContentTemplate } from "../database/models/index.js"
import { generateThumbnail, generateThumbnails } from "../modules/thumbnail/service.js"
import { generateSEOContent } from "../seo/seoService.js"
import { isImageKitConfigured } from "../config/imagekit.js"
import fs from "fs"
import path from "path"

// ─── Default pipeline timeout: 10 minutes ─────────────────────────
export const PIPELINE_TIMEOUT_MS = parseInt(process.env.PIPELINE_TIMEOUT_MS || "600000", 10)

// ─── Concurrent Pipeline Limit ────────────────────────────────────
// 🔴 FIX: Limit to 2 concurrent pipeline executions to prevent resource
// exhaustion (each pipeline spawns an FFmpeg subprocess). This avoids
// fork-bomb style DoS if rate limiting is evaded.
const MAX_CONCURRENT_PIPELINES = parseInt(process.env.MAX_CONCURRENT_PIPELINES || "2", 10)
let activePipelineCount = 0
const pipelineQueue = []

const acquirePipelineSlot = async () => {
  if (activePipelineCount < MAX_CONCURRENT_PIPELINES) {
    activePipelineCount++
    return true
  }
  // Queue up to 5 waiters; reject if queue is full
  return new Promise((resolve, reject) => {
    if (pipelineQueue.length >= 5) {
      reject(new Error("Pipeline queue is full (max 5 waiting). Try again later."))
      return
    }
    pipelineQueue.push(() => {
      activePipelineCount++
      resolve(true)
    })
  })
}

const releasePipelineSlot = () => {
  activePipelineCount--
  if (pipelineQueue.length > 0) {
    const next = pipelineQueue.shift()
    next()
  }
}

// ─── In-Memory Pipeline Status Tracking ───────────────────────────
const pipelineStatusMap = new Map()

const generateJobId = () => `pipeline-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

const updatePipelineStatus = (jobId, update) => {
  if (!jobId) return
  const current = pipelineStatusMap.get(jobId) || {}
  const updated = { ...current, ...update, lastUpdated: new Date().toISOString() }
  pipelineStatusMap.set(jobId, updated)
  log("INFO", "Pipeline status update", { jobId: jobId, status: updated.status, step: updated.step, progress: updated.progress })
}

export const getPipelineStatus = (jobId) => {
  return pipelineStatusMap.get(jobId) || null
}

/**
 * Returns all active (non-completed, non-failed) pipelines and their count.
 */
export const getActivePipelines = () => {
  const active = []
  for (const [jobId, status] of pipelineStatusMap.entries()) {
    if (status.status === 'processing' || status.status === 'running' || status.status === 'polling') {
      active.push({
        jobId,
        status: status.status,
        progress: status.progress ?? 0,
        step: status.step ?? 0,
        stepLabel: status.stepLabel || ''
      })
    }
  }
  return { active, count: active.length }
}

const log = (level, message, data = {}) => logger(level, `[PIPELINE] ${message}`, data)

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms))

/**
 * Track intermediate files so they can be cleaned up on pipeline failure.
 * NOTE: In concurrent pipelines, each pipeline run resets this array at the start.
 * This means temp files from previous concurrent runs could be lost, so we
 * use a Map keyed by jobId to isolate file tracking per pipeline instance.
 */
const _pipelineFiles = new Map()

const trackFile = (filePath, jobId) => {
  if (!filePath || !jobId) return
  if (!_pipelineFiles.has(jobId)) {
    _pipelineFiles.set(jobId, [])
  }
  _pipelineFiles.get(jobId).push(filePath)
}

const cleanupTempFiles = (jobId) => {
  const files = jobId ? (_pipelineFiles.get(jobId) || []) : []
  if (jobId) _pipelineFiles.delete(jobId)
  for (const file of files) {
    try {
      if (file && fs.existsSync(file)) {
        fs.unlinkSync(file)
        log("INFO", "Cleaned up intermediate file", { path: file })
      }
    } catch (err) {
      log("WARN", "Failed to clean up intermediate file", { path: file, error: err.message })
    }
  }

  // Also clean up any temp directories
  const tempDirs = ["assets/generated/final-videos/.temp-downloads"]
  for (const dir of tempDirs) {
    try {
      const resolved = path.resolve(dir)
      if (fs.existsSync(resolved)) {
        const files = fs.readdirSync(resolved)
        for (const f of files) {
          fs.unlinkSync(path.join(resolved, f))
        }
        fs.rmdirSync(resolved)
      }
    } catch { /* best-effort */ }
  }
}

/**
 * Wrap a promise with a configurable timeout.
 * Rejects with a TimeoutError if the promise does not settle within the given ms.
 */
const withTimeout = (promise, ms, label = "operation") => {
  let timer
  const timeoutPromise = new Promise((_, reject) => {
    timer = setTimeout(() => {
      reject(new Error(`Pipeline timeout: ${label} exceeded ${ms}ms`))
    }, ms)
  })
  return Promise.race([promise.finally(() => clearTimeout(timer)), timeoutPromise])
}

const generateVideoDescription = (script, title, tags, niche, options = {}) => {
  const { videoType = "short", language = "english", matchData } = options

  const isSports = niche === "Sports" || niche === "WorldCup" || matchData

  if (isSports && matchData) {
    const scoreLine = `${matchData.team1} ${matchData.score1 ?? 0} - ${matchData.score2 ?? 0} ${matchData.team2}`
    return `${title}\n\n⚽ Match: ${scoreLine}\n\n📌 About this video:\n${script.slice(0, 500)}...\n\n🔔 Subscribe for more football updates!\n\n${tags.map(t => `#${t.replace(/\s+/g, '')}`).join(' ')}`
  }

  if (videoType === "long") {
    return `${title}\n\n📌 About this video:\n${script.slice(0, 500)}...\n\n👍 Like and subscribe for more in-depth content!\n\n${tags.map(t => `#${t.replace(/\s+/g, '')}`).join(' ')}`
  }

  const ctaText = niche === "Finance" || niche === "Business" 
    ? "\n\n🔗 Links & Resources in Description\n\n💰 Invest Wisely!"
    : "\n\n🔗 Follow for more content!"

  return `${title}\n\n📌 About this video:\n${script.slice(0, 500)}...\n\n${ctaText}\n\n${tags.map(t => `#${t.replace(/\s+/g, '')}`).join(' ')}`
}

export const createVideoPipeline = async (options = {}) => {
  const {
    forceNiche,
    quality = "medium",
    videoType = "short",
    language = "english",
    contentTemplate: templateId,
    matchId,
    vars = {},
    jobId = null,
    // ── New options ──
    script: preGeneratedScript = null,   // pre-generated script to skip step 2
    skipScript = false,                   // alias for using pre-generated script
    generateThumbnail: doGenerateThumbnail = true, // auto-generate thumbnail from video
    thumbnailTimestamp = "00:01",         // timestamp for thumbnail extraction
    // ── Pre-generated assets (from frontend steps 3-4) ──
    preGeneratedAudioPath = null,         // skip voice generation if provided
    preGeneratedVideoPath = null,         // skip stock video download if provided
  } = options

  // 🔴 FIX: Acquire concurrency slot to prevent resource exhaustion.
  // Release happens in the finally block below.
  await acquirePipelineSlot()

  // Normalise: if skipScript is set but no script provided, just skip generation
  const hasPreGeneratedScript = !!preGeneratedScript

  // Initialize pipeline tracking
  if (jobId) {
    updatePipelineStatus(jobId, {
      jobId: jobId,
      step: 1,
      status: "processing",
      progress: 0,
      logs: ["Pipeline started"],
      result: null
    })
  }

  log("INFO", "Pipeline started", { videoType, language, hasPreGeneratedScript, doGenerateThumbnail })

  const startTime = Date.now()

  // Reset intermediate file tracking for this pipeline run
  if (jobId) _pipelineFiles.set(jobId, [])

  try {
    // Wrap the entire pipeline body with a configurable timeout.
    // pipelineBodyPromise holds the promise from the async IIFE.
    const pipelineBodyPromise = (async () => {
    let topic, niche, matchData, contentTemplate, script
    const orientation = videoType === "long" ? "landscape" : "portrait"

    if (matchId) {
      matchData = await MatchEvent.findOne({ matchId }).lean()
      if (matchData) {
        niche = "Sports"
        topic = `${matchData.team1} vs ${matchData.team2} - Match Analysis`
        log("INFO", "Using match data", { matchId, team1: matchData.team1, team2: matchData.team2, status: matchData.status })
      }
    }

    if (templateId) {
      contentTemplate = await ContentTemplate.findById(templateId).lean()
      if (contentTemplate) {
        niche = "Sports"
        log("INFO", "Using content template", { name: contentTemplate.name, category: contentTemplate.category })
      }
    }

    if (!topic) {
      // ── Step 1: Topic selection (progress 0-15%) ──
      if (jobId) {
        updatePipelineStatus(jobId, { step: 1, status: "processing", progress: 5, logs: ["Selecting niche and topic..."] })
      }

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

      if (jobId) {
        updatePipelineStatus(jobId, { step: 1, status: "completed", progress: 15, logs: [`Topic selected: ${topic} (${niche})`] })
      }
    }

    const scriptOptions = {
      niche,
      language,
      videoType,
      contentTemplate,
      matchData,
      vars
    }

    if (videoType === "long") {
      scriptOptions.maxWords = 1500
    }

    // ── Step 2: Script generation (progress 16-35%) ──
    if (hasPreGeneratedScript) {
      // Use pre-generated script, skip AI generation
      script = preGeneratedScript
      log("INFO", "Using pre-generated script", { wordCount: script.split(/\s+/).length, language, videoType })
      if (jobId) {
        updatePipelineStatus(jobId, { step: 2, status: "completed", progress: 35, logs: ["Using pre-generated script"] })
      }
    } else {
      if (jobId) {
        updatePipelineStatus(jobId, { step: 2, status: "processing", progress: 16, logs: ["Generating script..."] })
      }

      log("INFO", "Generating script...")
      script = await retryWithBackoff(() => generateScript(topic, scriptOptions), { name: "Generate script", maxRetries: 2 })
      log("INFO", "Script ready", { wordCount: script.split(/\s+/).length, language, videoType })

      if (jobId) {
        updatePipelineStatus(jobId, { step: 2, status: "completed", progress: 35, logs: ["Script generated successfully"] })
      }
    }

    const voiceOptions = { language }

    // ── Step 3: Voice generation (progress 36-45%) ──
    // 🔴 FIX: Sequential execution — voice must complete before video download.
    // Each step fully completes before the next begins. No parallel execution.
    let audioPath = null
    let audioImageKitUrl = null

    if (preGeneratedAudioPath) {
      // Use pre-generated audio from frontend step 3
      audioPath = preGeneratedAudioPath
      log("INFO", "Using pre-generated audio", { filename: path.basename(audioPath) })
      if (jobId) {
        updatePipelineStatus(jobId, { step: 3, status: "completed", progress: 45, logs: ["Using pre-generated audio"] })
      }
    } else {
      if (jobId) {
        updatePipelineStatus(jobId, { step: 3, status: "processing", progress: 36, logs: ["Generating voice..."] })
      }

      log("INFO", "Generating voice...")
      try {
        const audioResult = await retryWithBackoff(() => generateVoice(script, voiceOptions), { name: "Generate voice", maxRetries: 2 })
        // Handle both old (string) and new ({ path, imageKitUrl }) return format
        if (typeof audioResult === "string") {
          audioPath = audioResult
        } else if (audioResult && typeof audioResult === "object") {
          audioPath = audioResult.path || null
          audioImageKitUrl = audioResult.imageKitUrl || null
        }
        trackFile(audioPath, jobId)
        log("INFO", "Voice generated", { filename: path.basename(audioPath || "unknown") })
      } catch (err) {
        log("ERROR", "Voice generation failed", { error: err.message })
        throw new Error(`Voice generation failed: ${err.message}. Pipeline cannot continue without audio.`)
      }

      if (jobId) {
        updatePipelineStatus(jobId, { step: 3, status: "completed", progress: 45, logs: ["Voice generated successfully"] })
      }
    }

    // ── Step 4: Video download (progress 46-60%) ──
    // 🔴 FIX: Sequential — starts ONLY after voice generation is confirmed done.
    let videoPath = null
    let stockVideoImageKitUrl = null

    if (preGeneratedVideoPath) {
      // Use pre-generated video from frontend step 4
      videoPath = preGeneratedVideoPath
      log("INFO", "Using pre-generated video", { filename: path.basename(videoPath) })
      if (jobId) {
        updatePipelineStatus(jobId, { step: 4, status: "completed", progress: 60, logs: ["Using pre-generated video"] })
      }
    } else {
      if (jobId) {
        updatePipelineStatus(jobId, { step: 4, status: "processing", progress: 46, logs: ["Downloading stock video..."] })
      }

      log("INFO", "Downloading stock video...")
      try {
        const videoResult = await retryWithBackoff(() => downloadStockVideo(topic), { name: "Download stock video", maxRetries: 2 })
        // Handle both old (string) and new ({ path, imageKitUrl }) return format
        if (typeof videoResult === "string") {
          videoPath = videoResult
        } else if (videoResult && typeof videoResult === "object") {
          videoPath = videoResult.path || null
          stockVideoImageKitUrl = videoResult.imageKitUrl || null
        }
        trackFile(videoPath, jobId)
        log("INFO", "Stock video downloaded", { filename: path.basename(videoPath || "unknown") })
      } catch (err) {
        log("ERROR", "Stock video download failed", { error: err.message })
        throw new Error(`Video download failed: ${err.message}. Pipeline cannot continue without video.`)
      }

      if (jobId) {
        updatePipelineStatus(jobId, { step: 4, status: "completed", progress: 60, logs: ["Stock video downloaded successfully"] })
      }
    }

    log("INFO", "Assets ready", { audio: !!audioPath, video: !!videoPath })

    // ── Step 5: Metadata generation (progress 61-65%) ──
    // 🔴 FIX: Metadata now runs sequentially AFTER assets are ready (was previously parallel).
    let metadata = null
    if (jobId) {
      updatePipelineStatus(jobId, { step: 5, status: "processing", progress: 61, logs: ["Generating metadata..."] })
    }

    try {
      metadata = await retryWithBackoff(() => generateMetadata(script), { name: "Generate metadata", maxRetries: 2 })
      log("INFO", "Metadata generated", { title: metadata?.title })
    } catch (err) {
      log("ERROR", "Metadata generation failed, using fallback", { error: err.message })
      // metadata stays null — pipeline can continue with fallback values
    }

    if (jobId) {
      updatePipelineStatus(jobId, { step: 5, status: "completed", progress: 65, logs: ["Metadata generated"] })
    }

    // ── Step 6: Rendering (progress 66-85%) ──
    if (jobId) {
      updatePipelineStatus(jobId, { step: 6, status: "processing", progress: 66, logs: ["Rendering video..."] })
    }

    log("INFO", "Rendering video...", { orientation, quality })
    const renderResult = await retryWithBackoff(
      () => renderVideo(audioPath, videoPath, script, { quality, orientation, generateSubtitles: true }),
      { name: "Render video", maxRetries: 2 }
    )

    // renderResult is now { videoPath, subtitlePath, localVideoPath, videoImageKitUrl, subtitleImageKitUrl }
    const finalVideo = typeof renderResult === "string" ? renderResult : renderResult.videoPath
    const subtitlePath = typeof renderResult === "string" ? null : (renderResult.subtitlePath || null)
    // Keep the local path for operations that need local files (thumbnail, YouTube upload)
    const localVideoPath = typeof renderResult === "string" ? finalVideo : (renderResult.localVideoPath || finalVideo)
    // Capture ImageKit URLs from render (null if ImageKit not configured)
    const renderVideoImageKitUrl = typeof renderResult === "string" ? null : (renderResult.videoImageKitUrl || null)
    const renderSubtitleImageKitUrl = typeof renderResult === "string" ? null : (renderResult.subtitleImageKitUrl || null)

    // 🔴 FIX: Helper to convert paths to safe relative form.
    const toRelative = (absPath) => {
      if (!absPath || typeof absPath !== "string") return null
      // If it's already an ImageKit URL, return as-is
      if (absPath.startsWith("http://") || absPath.startsWith("https://")) {
        return absPath
      }
      const normalized = absPath.replace(/\\/g, "/")
      const assetsIdx = normalized.indexOf("assets/")
      if (assetsIdx >= 0) return normalized.slice(assetsIdx)
      const storageIdx = normalized.indexOf("storage/")
      if (storageIdx >= 0) return normalized.slice(storageIdx)
      return path.basename(absPath)
    }

    // 🔴 FIX: Don't log full file paths
    log("INFO", "Render complete", {
      finalVideo: path.basename(finalVideo),
      hasSubtitles: !!subtitlePath
    })

    if (jobId) {
      updatePipelineStatus(jobId, {
        step: 6,
        status: "completed",
        progress: 85,
        logs: ["Video rendered successfully"],
        subtitlePath: toRelative(subtitlePath)
      })
    }

    // ── Step 7: Thumbnail generation (progress 86-90%) ──
    let thumbnailPath = null
    let thumbnailImageKitUrl = null
    if (doGenerateThumbnail && localVideoPath) {
      if (jobId) {
        updatePipelineStatus(jobId, { step: 7, status: "processing", progress: 86, logs: ["Generating thumbnail..."] })
      }

      try {
        // 🔴 FIX: Log only basename
        log("INFO", "Generating thumbnail from video", { videoFile: path.basename(localVideoPath), timestamp: thumbnailTimestamp })
        const thumbnailResult = await generateThumbnail(localVideoPath, { timestamp: thumbnailTimestamp })
        // Handle both old (string) and new ({ path, imageKitUrl }) return format
        if (typeof thumbnailResult === "string") {
          thumbnailPath = thumbnailResult
        } else if (thumbnailResult && typeof thumbnailResult === "object") {
          thumbnailPath = thumbnailResult.path || null
          thumbnailImageKitUrl = thumbnailResult.imageKitUrl || null
        }
        // 🔴 FIX: Log only basename
        log("INFO", "Thumbnail generated", { filename: path.basename(thumbnailPath || "unknown") })
      } catch (thumbError) {
        log("WARN", "Thumbnail generation failed, continuing", { error: thumbError.message })
      }

      if (jobId) {
        updatePipelineStatus(jobId, { step: 7, status: "completed", progress: 90, logs: thumbnailPath ? ["Thumbnail generated"] : ["Thumbnail generation skipped"] })
      }
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2)
    // 🔴 FIX: Don't log full file paths
    log("INFO", "Pipeline rendered", {
      duration: `${duration}s`,
      finalVideo: path.basename(finalVideo),
      hasThumbnail: !!(thumbnailPath || thumbnailImageKitUrl)
    })

    // ── Step 8: SEO + Result preparation (progress 91-100%) ──
    if (jobId) {
      updatePipelineStatus(jobId, { step: 8, status: "processing", progress: 91, logs: ["Preparing metadata and SEO..."] })
    }

    // Use metadata if available, otherwise fall back to script-derived values
    const videoTitle = metadata?.title || topic || "Untitled Video"
    const videoTags = metadata?.tags || [niche, videoType, language].filter(Boolean)

    const description = generateVideoDescription(script, videoTitle, videoTags, niche, { videoType, language, matchData })

    // ── SEO step: Generate SEO-optimized content from metadata ──
    let seo = null
    try {
      log("INFO", "Generating SEO content", { topic, niche })
      seo = await generateSEOContent(topic, niche)
      log("INFO", "SEO content generated")
    } catch (seoError) {
      log("WARN", "SEO generation failed, continuing", { error: seoError.message })
    }

    const pipelineResult = {
      topic,
      niche,
      script,
      title: videoTitle,
      tags: videoTags,
      audio: toRelative(audioPath),
      stockVideo: toRelative(videoPath),
      finalVideo: toRelative(finalVideo),
      // SECURITY: localVideoPath is included internally for YouTube upload
      // and thumbnail generation, but is stripped before being stored in
      // the status map (which is served to the client via API).
      localVideoPath: localVideoPath || null,
      subtitlePath: toRelative(subtitlePath),
      thumbnailPath: toRelative(thumbnailPath),
      metadata,
      seo,
      videoType,
      language,
      description,
      matchData: matchData || null,

      // ── ImageKit URLs (populated by services that upload to ImageKit) ──
      imageKitUrls: {
        video: renderVideoImageKitUrl,       // set by renderService after ImageKit upload
        thumbnail: thumbnailImageKitUrl,     // set by thumbnailService after ImageKit upload
        audio: audioImageKitUrl,             // set by audioService after ImageKit upload
        subtitles: renderSubtitleImageKitUrl  // set by renderService after ImageKit upload
      }
    }

    if (jobId) {
      // SECURITY: Strip localVideoPath before storing in status map
      // to prevent leaking server filesystem paths via the status API.
      const { localVideoPath: _, ...safeResult } = pipelineResult
      updatePipelineStatus(jobId, {
        step: 8,
        status: "completed",
        progress: 100,
        result: safeResult,
        logs: ["Pipeline completed successfully"]
      })
      // Remove status entry after 1 hour to prevent unbounded growth
      setTimeout(() => pipelineStatusMap.delete(jobId), 3600000)
    }

    return pipelineResult
  })()

    // Apply the configurable timeout to the entire pipeline body
    return await withTimeout(pipelineBodyPromise, PIPELINE_TIMEOUT_MS, "Full pipeline")

  } catch (error) {
    log("ERROR", "Pipeline failed", { error: error.message, stack: error.stack })

    // Clean up intermediate files on failure to prevent temp file accumulation
    cleanupTempFiles(jobId)

    if (jobId) {
      const isTimeout = error.message && error.message.includes("Pipeline timeout")
      updatePipelineStatus(jobId, {
        status: "failed",
        error: error.message,
        logs: [isTimeout ? "Pipeline timed out" : `Pipeline failed: ${error.message}`]
      })
      // Remove status entry after 1 hour to prevent unbounded growth
      setTimeout(() => pipelineStatusMap.delete(jobId), 3600000)
    }

    throw error
  } finally {
    // 🔴 FIX: Always release the concurrency slot, even on failure
    releasePipelineSlot()
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

export const runWorldCupPipeline = async (options = {}) => {
  const { matchId, templateId, language = "english", quality = "medium" } = options

  let matchData = null
  if (matchId) {
    matchData = await MatchEvent.findOne({ matchId }).lean()
  }

  if (!matchData) {
    const trending = await getTrendingTopic()
    log("INFO", "No match data, using trending topic", { topic: trending.topic })
  }

  const contentTemplate = templateId
    ? await ContentTemplate.findById(templateId).lean()
    : null

  return createVideoPipeline({
    forceNiche: "Sports",
    quality,
    videoType: "short",
    language,
    contentTemplate,
    matchId,
    vars: matchData ? {
      team1: matchData.team1,
      team2: matchData.team2,
      score1: matchData.score1,
      score2: matchData.score2,
      ...matchData.goals?.reduce((acc, g, i) => ({ ...acc, [`player${i + 1}`]: g.player }), {})
    } : {}
  })
}

export const runFullPipeline = async (options = {}) => {
  const result = await createVideoPipeline(options)

  let videoId = null
  let uploaded = false
  let uploadError = null

  if (await isYouTubeAuthenticated()) {
    try {
      const isSportsContent = result.niche === "Sports" || result.niche === "WorldCup"
      log("INFO", "Uploading to YouTube...")
      // Use the local video file path for YouTube upload
      // The pipeline tracks the local path for this purpose
      let uploadFilePath = result.finalVideo
      // Check if there's a local video path we can use
      if (result.localVideoPath && fs.existsSync(result.localVideoPath)) {
        uploadFilePath = result.localVideoPath
      }
      const uploadResult = await uploadVideoToYouTube({
        filePath: uploadFilePath,
        title: result.title,
        description: result.description,
        tags: result.tags,
        privacyStatus: "public",
        categoryId: isSportsContent ? "17" : undefined
      })
      videoId = uploadResult.id
      uploaded = true
      log("INFO", "Upload successful", { videoId })
    } catch (error) {
      uploadError = error.message
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
    uploadStatus: {
      success: uploaded,
      videoId: videoId,
      ...(uploadError ? { reason: uploadError } : {}),
      ...(!uploaded && !uploadError ? { reason: "YouTube not authenticated" } : {})
    },
    niche: result.niche,
    topic: result.topic,
    message: uploaded 
      ? "Video uploaded successfully!" 
      : "Video created locally (YouTube upload pending - connect account in Settings)"
  }
}
