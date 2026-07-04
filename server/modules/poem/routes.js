import { Router } from "express"
import {
  getRandomPoem,
  getRandomPoems,
  getPoemById,
  getAllTags,
  resolvePoem,
} from "./poems.js"
import { generateHindiPoem } from "../script/service.js"
import { generateVoice } from "../audio/service.js"
import { downloadStockVideo } from "../video/service.js"
import { renderVideo } from "../../pipeline/renderService.js"
import { generateThumbnail } from "../thumbnail/service.js"
import { uploadVideoToYouTube } from "../upload/service.js"
import {
  runHindiPoemPipeline,
  getPipelineStatus,
  getActivePipelines,
  getPipelineStats,
  listRecentPipelines,
} from "./pipelineService.js"
import { getTopicStats, getCategories } from "./topicService.js"
import { log as logger } from "../../utils/logger.js"
import { retryWithBackoff } from "../../utils/retry.js"
import { isYouTubeAuthenticated } from "../../utils/youtubeAuth.js"
import {
  cleanupTempFiles,
  resolveRenderPaths,
  resolveMediaPath,
  trackPipelineMetric,
} from "./utils.js"
import { PIPELINE_CONFIG as CFG } from "./config.js"
import path from "path"

const router = Router()
const log = (level, msg, data = {}) => logger(level, `[HINDI-POEM] ${msg}`, data)

// ── Daily usage tracking (Set for O(1) lookups) ──────────────────

const poemState = {
  usedToday: new Set(),
  lastReset: new Date().toDateString(),
}

const resetDailyIfNeeded = () => {
  const today = new Date().toDateString()
  if (poemState.lastReset !== today) {
    poemState.usedToday.clear()
    poemState.lastReset = today
  }
}

const markUsed = (id) => poemState.usedToday.add(id)

// ── Input validation middleware ──────────────────────────────────

const validatePoemInput = (req, res, next) => {
  const { poem, customPoem, quality, autoUpload, background } = req.body

  if (poem !== undefined && typeof poem !== "string") {
    return res.status(400).json({ success: false, error: "poem must be a string" })
  }
  if (customPoem !== undefined && typeof customPoem !== "string") {
    return res.status(400).json({ success: false, error: "customPoem must be a string" })
  }
  if (quality !== undefined && !["low", "medium", "high"].includes(quality)) {
    return res.status(400).json({ success: false, error: "quality must be low, medium, or high" })
  }
  if (autoUpload !== undefined && typeof autoUpload !== "boolean") {
    return res.status(400).json({ success: false, error: "autoUpload must be a boolean" })
  }
  next()
}

// ── Shared video creation pipeline ──────────────────────────────

/**
 * Create a complete poem short video (TTS → background → render → thumbnail → upload).
 * Used by /short, /daily, and /quick to avoid duplication.
 *
 * @param {object}  poem
 * @param {object}  opts
 * @param {boolean} opts.autoUpload
 * @param {string}  opts.quality
 * @param {string}  [opts.jobId]  - for metrics tracking
 * @returns {object} result payload
 */
const createPoemShort = async (poem, { autoUpload = false, quality = "medium", jobId } = {}) => {
  const stepStart = (label) => ({ label, time: Date.now() })
  const stepEnd = (step) => ((Date.now() - step.time) / 1000)

  const filesToClean = []
  try {
    // Step 1 — TTS
    const s1 = stepStart("tts")
    log("INFO", "Step 1/5: Generating Hindi voice...", { poemId: poem.id })
    const audioResult = await retryWithBackoff(
      () => generateVoice(poem.lines, { language: CFG.tts.language }),
      { name: "Hindi TTS", maxRetries: CFG.retry.maxRetries }
    )
    const audioPath = resolveMediaPath(audioResult)
    filesToClean.push(audioPath)
    trackPipelineMetric(jobId, "tts", stepEnd(s1), true)

    // Step 2 — Background video
    const s2 = stepStart("background")
    log("INFO", "Step 2/5: Downloading background video...")
    const videoResult = await retryWithBackoff(
      () => downloadStockVideo(poem.background || "nature abstract"),
      { name: "Background video", maxRetries: CFG.retry.maxRetries }
    )
    const bgVideoPath = resolveMediaPath(videoResult)
    filesToClean.push(bgVideoPath)
    trackPipelineMetric(jobId, "background", stepEnd(s2), true)

    // Step 3 — Render
    const s3 = stepStart("render")
    log("INFO", "Step 3/5: Rendering portrait video...")
    const renderResult = await retryWithBackoff(
      () =>
        renderVideo(audioPath, bgVideoPath, poem.lines, {
          quality,
          orientation: CFG.video.orientation,
          generateSubtitles: true,
        }),
      { name: "Render video", maxRetries: CFG.retry.maxRetries }
    )
    const { finalVideo, localVideoPath } = resolveRenderPaths(renderResult)
    trackPipelineMetric(jobId, "render", stepEnd(s3), true)

    // Step 4 — Thumbnail (non-blocking)
    let thumbnailPath = null
    const s4 = stepStart("thumbnail")
    try {
      const thumbResult = await generateThumbnail(localVideoPath, {
        timestamp: CFG.thumbnail.timestamp,
      })
      thumbnailPath = resolveMediaPath(thumbResult)
      trackPipelineMetric(jobId, "thumbnail", stepEnd(s4), true)
    } catch (err) {
      log("WARN", "Thumbnail failed (non-blocking)", { error: err.message })
      trackPipelineMetric(jobId, "thumbnail", stepEnd(s4), false)
    }

    // Step 5 — YouTube upload (optional)
    let uploadResult = null
    if (autoUpload && (await isYouTubeAuthenticated())) {
      const s5 = stepStart("upload")
      try {
        log("INFO", "Step 5/5: Uploading to YouTube...")
        uploadResult = await uploadVideoToYouTube({
          filePath: localVideoPath,
          title: `${poem.title} | Hindi Shayari | #shorts`,
          description: `${poem.lines}\n\n#HindiShayari #Poetry #Shorts #Motivation`,
          tags: CFG.youtube.tags,
          privacyStatus: CFG.youtube.privacyStatus,
          categoryId: CFG.youtube.categoryId,
        })
        log("INFO", "Upload complete", { videoId: uploadResult.id })
        trackPipelineMetric(jobId, "upload", stepEnd(s5), true)
      } catch (err) {
        log("ERROR", "YouTube upload failed", { error: err.message })
        trackPipelineMetric(jobId, "upload", stepEnd(s5), false)
      }
    }

    return {
      poem: { id: poem.id, title: poem.title, lines: poem.lines },
      video: {
        path: path.basename(finalVideo),
        thumbnail: thumbnailPath ? path.basename(thumbnailPath) : null,
      },
      youtube: uploadResult
        ? { videoId: uploadResult.id, uploaded: true }
        : {
            uploaded: false,
            reason: !autoUpload ? "autoUpload=false" : "YouTube not authenticated",
          },
    }
  } finally {
    cleanupTempFiles(filesToClean)
  }
}

// ══════════════════════════════════════════════════════════════════
//  ROUTES
// ══════════════════════════════════════════════════════════════════

/**
 * GET /api/poems — List sample poems with tags
 */
router.get("/", (_req, res) => {
  resetDailyIfNeeded()
  const poems = getRandomPoems(5)
  const tags = getAllTags()

  res.json({
    success: true,
    data: {
      poems: poems.map((p) => ({
        id: p.id,
        title: p.title,
        lines: p.lines,
        tags: p.tags,
        background: p.background,
      })),
      tags,
      totalPoems: poems.length,
      usedToday: poemState.usedToday.size,
    },
  })
})

/**
 * GET /api/poems/random — Get a random poem
 */
router.get("/random", (_req, res) => {
  const poem = getRandomPoem()
  res.json({ success: true, data: poem })
})

/**
 * GET /api/poems/status — Today's usage status
 */
router.get("/status", (_req, res) => {
  resetDailyIfNeeded()
  res.json({
    success: true,
    data: {
      usedToday: poemState.usedToday.size,
      remaining: Math.max(0, CFG.dailyBatchSize - poemState.usedToday.size),
      usedIds: [...poemState.usedToday],
    },
  })
})

/**
 * GET /api/poems/:id — Get poem by ID
 */
router.get("/:id", (req, res) => {
  const poem = getPoemById(req.params.id)
  if (!poem) {
    return res.status(404).json({ success: false, error: "Poem not found" })
  }
  res.json({ success: true, data: poem })
})

/**
 * POST /api/poems/generate — Generate a custom Hindi poem using AI
 */
router.post("/generate", async (req, res) => {
  try {
    const { topic, style = "shayari" } = req.body

    if (!topic) {
      return res.status(400).json({ success: false, error: "Topic is required" })
    }

    const poem = await generateHindiPoem(topic, { style })
    res.json({ success: true, data: { poem, topic, style } })
  } catch (error) {
    log("ERROR", "Generate poem failed", { error: error.message })
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * POST /api/poems/short — Create a complete Hindi poem short video
 */
router.post("/short", validatePoemInput, async (req, res) => {
  const jobId = `short-${Date.now()}`
  try {
    const {
      poemId,
      customPoem,
      background = "nature",
      quality = "medium",
      autoUpload = false,
    } = req.body

    resetDailyIfNeeded()
    const excludeIds = [...poemState.usedToday]

    const poem = resolvePoem({ poemId, customPoem, background, excludeIds })
    if (!poem) {
      return res.status(404).json({ success: false, error: "No poems available" })
    }

    log("INFO", "Starting poem short creation", { jobId, poemId: poem.id, title: poem.title })
    markUsed(poem.id)

    const result = await createPoemShort(poem, { autoUpload, quality, jobId })
    res.json({ success: true, data: result })
  } catch (error) {
    log("ERROR", "Poem short creation failed", { jobId, error: error.message })
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * POST /api/poems/daily — Generate today's batch of Hindi poem shorts
 */
router.post("/daily", async (req, res) => {
  const jobId = `daily-${Date.now()}`
  try {
    log("INFO", `Starting daily Hindi poem batch (${CFG.dailyBatchSize} videos)`, { jobId })

    resetDailyIfNeeded()
    const excludeIds = [...poemState.usedToday]
    const poems = getRandomPoems(CFG.dailyBatchSize, excludeIds)
    const results = []

    for (let i = 0; i < poems.length; i++) {
      const poem = poems[i]
      log("INFO", `Creating video ${i + 1}/${poems.length}`, { title: poem.title })
      markUsed(poem.id)

      try {
        const result = await createPoemShort(poem, {
          autoUpload: true,
          quality: "medium",
          jobId: `${jobId}-${i}`,
        })
        results.push({
          poem: poem.title,
          videoPath: result.video.path,
          uploaded: result.youtube.uploaded,
          videoId: result.youtube.videoId || null,
          success: true,
        })
      } catch (err) {
        log("ERROR", "Failed to create video", { poem: poem.title, error: err.message })
        results.push({ poem: poem.title, success: false, error: err.message })
      }
    }

    const successCount = results.filter((r) => r.success).length
    res.json({
      success: true,
      data: {
        message: `Created ${successCount}/${poems.length} Hindi poem shorts`,
        results,
        usedToday: poemState.usedToday.size,
      },
    })
  } catch (error) {
    log("ERROR", "Daily batch failed", { jobId, error: error.message })
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * POST /api/poems/quick — One-click: generate video + auto-upload
 */
router.post("/quick", validatePoemInput, async (req, res) => {
  const jobId = `quick-${Date.now()}`
  try {
    const { poem: customPoemText, autoUpload = true } = req.body

    resetDailyIfNeeded()
    const excludeIds = [...poemState.usedToday]

    const poem = resolvePoem({ customPoem: customPoemText, excludeIds })
    if (!poem) {
      return res.status(404).json({ success: false, error: "No poems available" })
    }

    log("INFO", "Quick generation started", { jobId, poemId: poem.id, title: poem.title })
    markUsed(poem.id)

    const result = await createPoemShort(poem, { autoUpload, quality: "medium", jobId })

    res.json({
      success: true,
      data: {
        videoId: result.youtube.videoId || null,
        title: result.poem.title,
        lines: result.poem.lines,
        uploaded: result.youtube.uploaded,
        youtubeUrl: result.youtube.videoId
          ? `https://youtube.com/shorts/${result.youtube.videoId}`
          : null,
        videoFile: result.video.path,
        thumbnail: result.video.thumbnail,
      },
    })
  } catch (error) {
    log("ERROR", "Quick generation failed", { jobId, error: error.message })
    res.status(500).json({ success: false, error: error.message })
  }
})

// ══════════════════════════════════════════════════════════════════
//  FULL PIPELINE ROUTES (14-step pipeline)
// ══════════════════════════════════════════════════════════════════

/**
 * POST /api/poems/pipeline — Run the full 14-step Hindi poem pipeline
 *
 * Body:
 *   { dryRun?, autoUpload?, quality?, customPoem?, customTopic?, preferredCategory?, jobId? }
 *
 * Steps: Topic → Poem AI → Scenes → Images → TTS → Music → Subtitles →
 *        Render → Thumbnail → SEO → Quality → ImageKit → MongoDB → YouTube
 */
router.post("/pipeline", async (req, res) => {
  try {
    const {
      dryRun = false,
      autoUpload = true,
      quality = "medium",
      customPoem = null,
      customTopic = null,
      preferredCategory = null,
      jobId = null,
    } = req.body

    log("INFO", "Full pipeline triggered", { dryRun, autoUpload, quality, hasCustomPoem: !!customPoem })

    const result = await runHindiPoemPipeline({
      jobId,
      dryRun,
      autoUpload,
      quality,
      customPoem,
      customTopic,
      preferredCategory,
    })

    res.json({ success: true, data: result })
  } catch (error) {
    log("ERROR", "Full pipeline failed", { error: error.message })
    res.status(500).json({
      success: false,
      error: error.message,
      statusCode: 500,
      timestamp: new Date().toISOString(),
    })
  }
})

/**
 * POST /api/poems/pipeline/batch — Run multiple pipeline jobs sequentially
 *
 * Body:
 *   { count: number, dryRun?, autoUpload?, quality?, preferredCategory? }
 */
router.post("/pipeline/batch", async (req, res) => {
  try {
    const {
      count = 3,
      dryRun = false,
      autoUpload = true,
      quality = "medium",
      preferredCategory = null,
    } = req.body

    const batchCount = Math.min(Math.max(count, 1), 10) // clamp 1-10
    log("INFO", "Batch pipeline triggered", { count: batchCount, dryRun })

    const results = []
    for (let i = 0; i < batchCount; i++) {
      log("INFO", `Batch: Running pipeline ${i + 1}/${batchCount}`)
      try {
        const result = await runHindiPoemPipeline({
          dryRun,
          autoUpload,
          quality,
          preferredCategory,
        })
        results.push({ success: true, ...result })
      } catch (err) {
        log("ERROR", `Batch: Pipeline ${i + 1} failed`, { error: err.message })
        results.push({ success: false, error: err.message })
      }
    }

    const successCount = results.filter((r) => r.success).length
    res.json({
      success: true,
      data: {
        message: `Completed ${successCount}/${batchCount} pipelines`,
        results,
      },
    })
  } catch (error) {
    log("ERROR", "Batch pipeline failed", { error: error.message })
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * GET /api/poems/pipeline/status/:jobId — Get pipeline status
 */
router.get("/pipeline/status/:jobId", (req, res) => {
  const status = getPipelineStatus(req.params.jobId)
  if (!status) {
    return res.status(404).json({ success: false, error: "Pipeline job not found" })
  }
  res.json({ success: true, data: status })
})

/**
 * GET /api/poems/pipeline/active — Get all active (running) pipelines
 */
router.get("/pipeline/active", (_req, res) => {
  const active = getActivePipelines()
  res.json({ success: true, data: active })
})

/**
 * GET /api/poems/pipeline/stats — Get pipeline statistics
 */
router.get("/pipeline/stats", async (_req, res) => {
  try {
    const stats = await getPipelineStats()
    res.json({ success: true, data: stats })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * GET /api/poems/pipeline/recent — List recent pipeline runs
 */
router.get("/pipeline/recent", async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 10, 50)
    const pipelines = await listRecentPipelines(limit)
    res.json({ success: true, data: pipelines })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * GET /api/poems/pipeline/topics — Get topic pool stats
 */
router.get("/pipeline/topics", async (_req, res) => {
  try {
    const stats = await getTopicStats()
    const categories = getCategories()
    res.json({ success: true, data: { ...stats, categories } })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * POST /api/poems/pipeline/resume/:jobId — Resume a failed pipeline
 */
router.post("/pipeline/resume/:jobId", async (req, res) => {
  try {
    const { jobId } = req.params
    log("INFO", "Resuming pipeline", { jobId })

    const result = await runHindiPoemPipeline({
      jobId,
      dryRun: req.body.dryRun || false,
      autoUpload: req.body.autoUpload !== false,
      quality: req.body.quality || "medium",
    })

    res.json({ success: true, data: result })
  } catch (error) {
    log("ERROR", "Pipeline resume failed", { jobId: req.params.jobId, error: error.message })
    res.status(500).json({ success: false, error: error.message })
  }
})

export default router
