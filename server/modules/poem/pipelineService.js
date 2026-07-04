/**
 * Hindi Poem Shorts Pipeline Service
 *
 * Main orchestrator for the end-to-end Hindi poem Shorts creation pipeline.
 * 14 sequential steps with retry support, dry-run mode, resume from failure,
 * and MongoDB-backed state tracking.
 *
 * Steps:
 *  1.  Topic Selection (avoid duplicates from TopicHistory)
 *  2.  Poem Generation (Groq AI — emotional Hindi poem)
 *  3.  Scene Splitting (split poem into 3-5 scenes)
 *  4.  AI Image Generation (Pexels stock images per scene)
 *  5.  Hindi TTS Voiceover (Edge TTS hi-IN-SwaraNeural)
 *  6.  Background Music (random from assets/music/)
 *  7.  Subtitle Generation (SRT from poem lines)
 *  8.  Video Rendering (FFmpeg — 1080x1920 portrait)
 *  9.  Thumbnail Generation (FFmpeg frame extraction)
 * 10.  SEO Generation (title, description, tags)
 * 11.  Quality Check (video duration, resolution, audio sync)
 * 12.  ImageKit Upload (all media files)
 * 13.  MongoDB Save (only ImageKit URLs + metadata)
 * 14.  YouTube Upload (if autoUpload=true)
 */

import fs from "fs"
import path from "path"
import crypto from "crypto"
import { fileURLToPath } from "url"

import { getGroqClient } from "../../config/groq.js"
import { selectTopic, recordTopicUsage } from "./topicService.js"
import { splitIntoScenes, generateSrtFromScenes, validateScenes } from "./sceneService.js"
import { generatePoemSEO, buildYouTubePayload } from "./seoService.js"
import { runQualityChecks } from "./qualityService.js"
import { generateVoice } from "../audio/service.js"
import { downloadStockVideo } from "../video/service.js"
import { renderVideo } from "../../pipeline/renderService.js"
import { generateThumbnail } from "../thumbnail/service.js"
import { uploadVideoToYouTube } from "../upload/service.js"
import { retryWithBackoff } from "../../utils/retry.js"
import { log as logger } from "../../utils/logger.js"
import { isImageKitConfigured } from "../../config/imagekit.js"
import { uploadFile as ikUpload, getBucketPath } from "../../services/imagekitService.js"
import PoemPipeline from "../../database/models/PoemPipeline.js"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const log = (level, message, data = {}) => logger(level, `[POEM-PIPELINE] ${message}`, data)

// ─── Constants ──────────────────────────────────────────────────────────

const MAX_RETRIES_PER_STEP = 3
const PIPELINE_TIMEOUT_MS = parseInt(process.env.PIPELINE_TIMEOUT_MS || "600000", 10)
const MUSIC_DIR = path.resolve(__dirname, "..", "..", "..", "assets", "music")
const TEMP_DIR = path.resolve(__dirname, "..", "..", "..", "assets", "generated", "poem-pipeline")

const STEP_LABELS = [
  "Topic Selection",           // 1
  "Poem Generation",           // 2
  "Scene Splitting",           // 3
  "Image Generation",          // 4
  "Hindi TTS Voiceover",       // 5
  "Background Music",          // 6
  "Subtitle Generation",       // 7
  "Video Rendering",           // 8
  "Thumbnail Generation",      // 9
  "SEO Generation",            // 10
  "Quality Check",             // 11
  "ImageKit Upload",           // 12
  "MongoDB Save",              // 13
  "YouTube Upload",            // 14
]

const TOTAL_STEPS = STEP_LABELS.length

// ─── Concurrency Control ────────────────────────────────────────────────

const MAX_CONCURRENT = parseInt(process.env.MAX_CONCURRENT_POEM_PIPELINES || "2", 10)
let activeCount = 0
const waitQueue = []

const acquireSlot = async () => {
  if (activeCount < MAX_CONCURRENT) {
    activeCount++
    return
  }
  return new Promise((resolve, reject) => {
    if (waitQueue.length >= 5) {
      reject(new Error("Pipeline queue is full (max 5 waiting)"))
      return
    }
    waitQueue.push(() => {
      activeCount++
      resolve()
    })
  })
}

const releaseSlot = () => {
  activeCount--
  if (waitQueue.length > 0) {
    const next = waitQueue.shift()
    next()
  }
}

// ─── In-Memory Status Map ───────────────────────────────────────────────

const statusMap = new Map()

const updateStatus = (jobId, update) => {
  if (!jobId) return
  const current = statusMap.get(jobId) || {}
  const merged = { ...current, ...update, lastUpdated: new Date().toISOString() }
  statusMap.set(jobId, merged)
}

export const getPipelineStatus = (jobId) => statusMap.get(jobId) || null

export const getActivePipelines = () => {
  const active = []
  for (const [jobId, status] of statusMap.entries()) {
    if (["pending", "processing"].includes(status.status)) {
      active.push({
        jobId,
        status: status.status,
        step: status.currentStep || 0,
        stepLabel: status.currentStepLabel || "",
        progress: status.progress || 0,
      })
    }
  }
  return { active, count: active.length }
}

// ─── Utilities ──────────────────────────────────────────────────────────

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const generateJobId = () => `poem-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`

const resolveProjectPath = (relative) => {
  if (path.isAbsolute(relative)) return relative
  return path.resolve(__dirname, "..", "..", "..", relative)
}

/**
 * Wrap a promise with a configurable timeout.
 */
const withTimeout = (promise, ms, label = "operation") => {
  let timer
  const timeoutPromise = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`Timeout: ${label} exceeded ${ms}ms`)), ms)
  })
  return Promise.race([promise.finally(() => clearTimeout(timer)), timeoutPromise])
}

/**
 * Execute a pipeline step with retry logic.
 *
 * @param {string} stepName - Human-readable step name
 * @param {Function} fn - Async function to execute
 * @param {number} [maxRetries=3]
 * @returns {Promise<*>}
 */
const executeStep = async (stepName, fn, maxRetries = MAX_RETRIES_PER_STEP) => {
  return retryWithBackoff(fn, { name: stepName, maxRetries })
}

/**
 * Ensure temp and output directories exist.
 */
const ensureDirectories = () => {
  const dirs = [
    TEMP_DIR,
    resolveProjectPath("assets/generated/audio"),
    resolveProjectPath("assets/generated/videos"),
    resolveProjectPath("assets/generated/final-videos"),
    resolveProjectPath("assets/generated/thumbnails"),
    resolveProjectPath("assets/generated/subtitles"),
  ]
  for (const dir of dirs) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
  }
}

/**
 * Clean up temp files for a specific job.
 */
const cleanupJobFiles = (jobId) => {
  const jobDir = path.join(TEMP_DIR, jobId)
  try {
    if (fs.existsSync(jobDir)) {
      const files = fs.readdirSync(jobDir)
      for (const f of files) {
        fs.unlinkSync(path.join(jobDir, f))
      }
      fs.rmdirSync(jobDir)
    }
  } catch {
    // best-effort
  }
}

/**
 * Check if YouTube is authenticated.
 */
const isYouTubeAuthenticated = async () => {
  try {
    const { default: ServerCredential } = await import(
      "../../database/models/ServerCredential.js"
    )
    const tokens = await ServerCredential.retrieve("youtube-oauth")
    return !!tokens
  } catch {
    return false
  }
}

// ─── Step Implementations ───────────────────────────────────────────────

/**
 * Step 1: Topic Selection
 */
const stepTopicSelection = async (context) => {
  const { options, jobId } = context

  const topicResult = await selectTopic({
    preferredCategory: options.preferredCategory || null,
    forceTopic: options.customTopic || null,
    jobId,
  })

  context.topic = topicResult.text
  context.category = topicResult.category

  log("INFO", "Step 1: Topic selected", { topic: topicResult.text, category: topicResult.category })
}

/**
 * Step 2: Poem Generation (Groq AI)
 */
const stepPoemGeneration = async (context) => {
  const { topic, jobId } = context

  if (context.customPoem) {
    // User provided a custom poem — parse it
    const lines = context.customPoem
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 0)

    context.poem = {
      title: lines[0]?.substring(0, 30) || topic,
      lines,
      lineCount: lines.length,
      theme: context.category,
    }
    log("INFO", "Step 2: Using custom poem", { lineCount: lines.length })
    return
  }

  const POEM_PROMPT = `
You are a famous Hindi poet (शायर). Write an emotional, engaging Hindi poem.

Topic: ${topic}
Language: Pure Hindi (Devanagari script)
Duration: 15-30 seconds when spoken aloud

RULES:
- Write 8-12 lines (4-6 couplets/शेर)
- Use beautiful Hindi words and imagery
- Must be emotional and touching
- Easy to understand for common people
- Each line should be 8-12 words max
- End with a powerful message
- NO English words mixed in

OUTPUT FORMAT (JSON only, no markdown fences):
{
  "title": "Short Hindi title (3-5 words)",
  "lines": ["line1", "line2", ...],
  "theme": "motivation|nature|love|friendship|wisdom|spiritual"
}
`

  const completion = await retryWithBackoff(async () => {
    const model = process.env.GROQ_MODEL || "llama-3.3-70b-versatile"
    const result = await getGroqClient().chat.completions.create({
      model,
      messages: [{ role: "user", content: POEM_PROMPT }],
      temperature: 0.9,
      max_tokens: 800,
    })
    return result?.choices?.[0]?.message?.content
  }, { name: "Groq Poem Generation", maxRetries: 3 })

  // Parse JSON response
  let poemData
  try {
    // Strip markdown fences if present
    const cleaned = completion
      .replace(/```json\s*/g, "")
      .replace(/```\s*/g, "")
      .trim()
    poemData = JSON.parse(cleaned)
  } catch {
    // Fallback: treat the entire response as poem lines
    log("WARN", "Could not parse JSON from AI, using raw text", { jobId })
    const lines = completion
      .split("\n")
      .map((l) => l.replace(/^\d+[\.\)]\s*/, "").trim())
      .filter((l) => l.length > 0)

    poemData = {
      title: topic.substring(0, 30),
      lines,
      theme: context.category,
    }
  }

  if (!poemData.lines || !Array.isArray(poemData.lines) || poemData.lines.length < 4) {
    throw new Error("AI generated poem has fewer than 4 lines — retrying")
  }

  context.poem = {
    title: poemData.title || topic.substring(0, 30),
    lines: poemData.lines,
    lineCount: poemData.lines.length,
    theme: poemData.theme || context.category,
  }

  log("INFO", "Step 2: Poem generated", { title: context.poem.title, lineCount: context.poem.lineCount })
}

/**
 * Step 3: Scene Splitting
 */
const stepSceneSplitting = async (context) => {
  const scenes = splitIntoScenes(context.poem.lines)
  const validation = validateScenes(scenes)

  if (!validation.valid) {
    log("WARN", "Scene validation warnings", { errors: validation.errors })
  }

  context.scenes = scenes
  log("INFO", "Step 3: Scenes created", { count: scenes.length })
}

/**
 * Step 4: Image Generation (Pexels stock images per scene)
 */
const stepImageGeneration = async (context) => {
  const { scenes, jobId } = context

  const sceneImages = []

  for (let i = 0; i < scenes.length; i++) {
    const scene = scenes[i]

    // Build a search query from scene keywords
    const searchQuery = scene.keywords.length > 0
      ? scene.keywords.slice(0, 3).join(" ")
      : "nature abstract"

    try {
      // Use Pexels to find a relevant image
      const axios = (await import("axios")).default
      const response = await axios.get("https://api.pexels.com/v1/search", {
        headers: { Authorization: process.env.PEXELS_API_KEY },
        params: { query: searchQuery, per_page: 5, orientation: "portrait" },
        timeout: 15000,
      })

      const photos = response.data?.photos
      if (photos && photos.length > 0) {
        const photo = photos[Math.floor(Math.random() * photos.length)]
        const imageUrl = photo.src?.large2x || photo.src?.large || photo.src?.original

        // Download the image
        const imageResponse = await axios({
          url: imageUrl,
          method: "GET",
          responseType: "stream",
          timeout: 30000,
        })

        const imageDir = path.join(TEMP_DIR, jobId)
        if (!fs.existsSync(imageDir)) fs.mkdirSync(imageDir, { recursive: true })

        const imagePath = path.join(imageDir, `scene_${i + 1}.jpg`)
        const writer = fs.createWriteStream(imagePath)

        await new Promise((resolve, reject) => {
          imageResponse.data.pipe(writer)
          writer.on("finish", resolve)
          writer.on("error", reject)
        })

        sceneImages.push({
          sceneNumber: scene.sceneNumber,
          imagePath,
          imageUrl: photo.src?.original || null,
          photographer: photo.photographer || "Unknown",
        })

        log("INFO", `Step 4: Scene ${i + 1} image downloaded`, {
          photographer: photo.photographer,
          query: searchQuery,
        })
      } else {
        // No images found — use placeholder
        sceneImages.push({
          sceneNumber: scene.sceneNumber,
          imagePath: null,
          imageUrl: null,
          photographer: null,
        })
        log("WARN", `Step 4: No images found for scene ${i + 1}`, { query: searchQuery })
      }
    } catch (err) {
      log("WARN", `Step 4: Image download failed for scene ${i + 1}`, { error: err.message })
      sceneImages.push({
        sceneNumber: scene.sceneNumber,
        imagePath: null,
        imageUrl: null,
        photographer: null,
      })
    }
  }

  context.sceneImages = sceneImages
  log("INFO", "Step 4: Image generation complete", {
    total: scenes.length,
    downloaded: sceneImages.filter((i) => i.imagePath).length,
  })
}

/**
 * Step 5: Hindi TTS Voiceover (Edge TTS)
 */
const stepTTSVoiceover = async (context) => {
  const fullText = context.poem.lines.join("\n")

  const audioResult = await retryWithBackoff(
    () => generateVoice(fullText, { language: "hinglish" }),
    { name: "Hindi TTS", maxRetries: 2 }
  )

  // Handle both old (string) and new ({ path, imageKitUrl }) return format
  if (typeof audioResult === "string") {
    context.audioPath = audioResult
  } else {
    context.audioPath = audioResult.path
    context.audioImageKitUrl = audioResult.imageKitUrl || null
  }

  log("INFO", "Step 5: TTS voiceover complete", { audioFile: path.basename(context.audioPath) })
}

/**
 * Step 6: Background Music
 *
 * Searches assets/music/ for audio files. If none exist, uses silence.
 */
const stepBackgroundMusic = async (context) => {
  let musicPath = null
  let musicFilename = null

  try {
    if (fs.existsSync(MUSIC_DIR)) {
      const files = fs.readdirSync(MUSIC_DIR).filter((f) =>
        /\.(mp3|wav|ogg|m4a)$/i.test(f)
      )

      if (files.length > 0) {
        musicFilename = files[Math.floor(Math.random() * files.length)]
        musicPath = path.join(MUSIC_DIR, musicFilename)
      }
    }
  } catch {
    // Music directory might not exist — that's fine
  }

  context.backgroundMusic = musicPath
    ? { path: musicPath, filename: musicFilename }
    : null

  log("INFO", "Step 6: Background music", {
    found: !!musicPath,
    filename: musicFilename || "none (will use audio only)",
  })
}

/**
 * Step 7: Subtitle Generation (SRT from poem lines)
 */
const stepSubtitleGeneration = async (context) => {
  const { scenes, jobId } = context

  const srtContent = generateSrtFromScenes(scenes)

  // Write SRT to temp file
  const srtDir = resolveProjectPath("assets/generated/subtitles")
  if (!fs.existsSync(srtDir)) fs.mkdirSync(srtDir, { recursive: true })

  const srtPath = path.join(srtDir, `poem-sub-${Date.now()}.srt`)
  fs.writeFileSync(srtPath, srtContent, "utf-8")

  context.subtitlePath = srtPath
  context.srtContent = srtContent

  log("INFO", "Step 7: Subtitles generated", { cueCount: scenes.reduce((n, s) => n + s.lines.length, 0) })
}

/**
 * Step 8: Video Rendering (FFmpeg — 1080x1920 portrait)
 *
 * Uses the first scene image as a background, loops it for audio duration,
 * with Ken Burns effect and burned-in subtitles.
 */
const stepVideoRendering = async (context) => {
  const { audioPath, sceneImages, subtitlePath, backgroundMusic, jobId } = context

  // Determine the primary background
  // Use the first available scene image, or fall back to a Pexels video
  const primaryImage = sceneImages.find((img) => img.imagePath)?.imagePath

  let videoSource = primaryImage
  let usedFallback = false

  if (!videoSource) {
    // No scene images — download a stock video as background
    log("INFO", "Step 8: No scene images, downloading stock video background")
    try {
      const videoResult = await retryWithBackoff(
        () => downloadStockVideo(context.topic || "nature abstract", { orientation: "portrait" }),
        { name: "Fallback stock video", maxRetries: 2 }
      )
      videoSource = typeof videoResult === "string" ? videoResult : videoResult.path
      usedFallback = true
    } catch (err) {
      throw new Error(`No background source available: ${err.message}`)
    }
  }

  // If background music exists, mix it with the TTS audio at low volume
  let finalAudioPath = audioPath
  if (backgroundMusic?.path && fs.existsSync(backgroundMusic.path)) {
    try {
      const { resolveFfmpegPath: getFfmpeg } = await import("../../utils/findFfmpeg.js")
      const ffmpegPath = await getFfmpeg()
      if (ffmpegPath) {
        const mixedAudioPath = path.join(TEMP_DIR, jobId, `mixed_audio_${Date.now()}.mp3`)
        const { spawn } = await import("child_process")

        await new Promise((resolve, reject) => {
          const proc = spawn(ffmpegPath, [
            "-y",
            "-i", audioPath,
            "-i", backgroundMusic.path,
            "-filter_complex",
            "[0:a]volume=1.0[tts];[1:a]volume=0.15[bg];[tts][bg]amix=inputs=2:duration=first:dropout_transition=2[out]",
            "-map", "[out]",
            "-c:a", "libmp3lame",
            "-q:a", "2",
            mixedAudioPath,
          ])

          let stderr = ""
          proc.stderr.on("data", (d) => { stderr += d.toString() })
          proc.on("close", (code) => {
            if (code === 0 && fs.existsSync(mixedAudioPath)) {
              log("INFO", "Background music mixed", { volume: "15%" })
              resolve()
            } else {
              log("WARN", "Music mixing failed, using original audio", { code })
              resolve() // Don't fail — just use original audio
            }
          })
          proc.on("error", () => resolve())
        })

        if (fs.existsSync(mixedAudioPath)) {
          finalAudioPath = mixedAudioPath
        }
      }
    } catch (err) {
      log("WARN", "Music mixing skipped", { error: err.message })
    }
  }

  // Render the video
  const renderResult = await retryWithBackoff(
    () => renderVideo(finalAudioPath, videoSource, context.poem.lines.join("\n"), {
      quality: context.options.quality || "medium",
      orientation: "portrait",
      generateSubtitles: false, // We already have our own subtitles
    }),
    { name: "Render video", maxRetries: 2 }
  )

  // Handle return format
  if (typeof renderResult === "string") {
    context.renderedVideoPath = renderResult
    context.localVideoPath = renderResult
  } else {
    context.renderedVideoPath = renderResult.videoPath
    context.localVideoPath = renderResult.localVideoPath || renderResult.videoPath
  }

  log("INFO", "Step 8: Video rendered", { file: path.basename(context.localVideoPath) })
}

/**
 * Step 9: Thumbnail Generation (FFmpeg frame extraction)
 */
const stepThumbnailGeneration = async (context) => {
  const { localVideoPath, jobId } = context

  try {
    const thumbResult = await generateThumbnail(localVideoPath, { timestamp: "00:01" })

    if (typeof thumbResult === "string") {
      context.thumbnailPath = thumbResult
    } else {
      context.thumbnailPath = thumbResult.path
      context.thumbnailImageKitUrl = thumbResult.imageKitUrl || null
    }

    log("INFO", "Step 9: Thumbnail generated", { file: path.basename(context.thumbnailPath || "unknown") })
  } catch (err) {
    log("WARN", "Step 9: Thumbnail generation failed (non-blocking)", { error: err.message })
    context.thumbnailPath = null
  }
}

/**
 * Step 10: SEO Generation (title, description, tags)
 */
const stepSEOGeneration = async (context) => {
  const seo = generatePoemSEO({
    poemTitle: context.poem.title,
    poemLines: context.poem.lines,
    topic: context.topic,
    category: context.category,
    sceneCount: context.scenes.length,
  })

  context.seo = seo
  log("INFO", "Step 10: SEO generated", { title: seo.title.substring(0, 50) })
}

/**
 * Step 11: Quality Check (video duration, resolution, audio sync)
 */
const stepQualityCheck = async (context) => {
  const { localVideoPath, audioPath, subtitlePath } = context

  const qualityResult = await runQualityChecks({
    videoPath: localVideoPath,
    audioPath,
    subtitlePath,
  })

  context.qualityCheck = qualityResult

  if (!qualityResult.passed) {
    log("WARN", "Step 11: Quality check failed", {
      failedChecks: qualityResult.checks.filter((c) => !c.passed).map((c) => c.name),
    })
    // Don't abort — log and continue. The pipeline can still produce a result.
  } else {
    log("INFO", "Step 11: Quality check passed", { checks: qualityResult.checks.length })
  }
}

/**
 * Step 12: ImageKit Upload (all media files)
 */
const stepImageKitUpload = async (context) => {
  if (!isImageKitConfigured()) {
    log("INFO", "Step 12: ImageKit not configured, skipping upload")
    context.imageKitUrls = {}
    return
  }

  const urls = {}

  const uploads = [
    { key: "video", filePath: context.localVideoPath, type: "final-videos" },
    { key: "thumbnail", filePath: context.thumbnailPath, type: "thumbnails" },
    { key: "subtitles", filePath: context.subtitlePath, type: "subtitles" },
    { key: "audio", filePath: context.audioPath, type: "audio" },
  ]

  for (const { key, filePath, type } of uploads) {
    if (!filePath || !fs.existsSync(filePath)) continue

    try {
      const fileName = path.basename(filePath)
      const { folder } = getBucketPath(type, fileName)
      const result = await ikUpload(filePath, fileName, folder)
      if (result) {
        urls[key] = result.url
        log("INFO", `Step 12: ${key} uploaded to ImageKit`, { url: result.url.slice(0, 80) })
      }
    } catch (err) {
      log("WARN", `Step 12: ${key} upload failed (non-blocking)`, { error: err.message })
    }
  }

  // Upload scene images
  for (const img of (context.sceneImages || [])) {
    if (!img.imagePath || !fs.existsSync(img.imagePath)) continue

    try {
      const fileName = path.basename(img.imagePath)
      const { folder } = getBucketPath("thumbnails", fileName)
      const result = await ikUpload(img.imagePath, fileName, folder)
      if (result) {
        img.imageKitUrl = result.url
      }
    } catch {
      // non-blocking
    }
  }

  context.imageKitUrls = urls
  log("INFO", "Step 12: ImageKit upload complete", { uploadedCount: Object.keys(urls).length })
}

/**
 * Step 13: MongoDB Save (only ImageKit URLs + metadata)
 */
const stepMongoDBSave = async (context) => {
  const { jobId, topic, category, poem, scenes, audioPath, backgroundMusic, subtitlePath,
    srtContent, localVideoPath, thumbnailPath, seo, qualityCheck, imageKitUrls, options } = context

  const pipelineDoc = await PoemPipeline.findOneAndUpdate(
    { jobId },
    {
      $set: {
        status: options.dryRun ? "dry-run" : "completed",
        topic,
        poem: {
          title: poem.title,
          lines: poem.lines,
          lineCount: poem.lineCount,
          language: "hindi",
        },
        scenes: scenes.map((s) => ({
          sceneNumber: s.sceneNumber,
          text: s.text,
          duration: s.duration,
          imageUrl: s.imagePath ? path.basename(s.imagePath) : null,
          imageKitFileId: null,
        })),
        audio: {
          ttsFile: imageKitUrls.audio || path.basename(audioPath),
          duration: 0,
          voice: "hi-IN-SwaraNeural",
        },
        backgroundMusic: backgroundMusic
          ? { filename: backgroundMusic.filename, path: backgroundMusic.path }
          : { filename: null, path: null },
        subtitles: {
          srtContent,
          imageKitUrl: imageKitUrls.subtitles || null,
        },
        video: {
          finalVideoUrl: imageKitUrls.video || path.basename(localVideoPath),
          thumbnailUrl: imageKitUrls.thumbnail || (thumbnailPath ? path.basename(thumbnailPath) : null),
          duration: qualityCheck?.checks?.find((c) => c.name === "video_duration")?.message
            ? parseFloat(qualityCheck.checks.find((c) => c.name === "video_duration").message.match(/[\d.]+/)?.[0] || "0")
            : 0,
          resolution: "1080x1920",
        },
        seo: {
          title: seo.title,
          description: seo.description,
          tags: seo.tags,
          hashtags: seo.hashtags,
        },
        qualityCheck: {
          passed: qualityCheck.passed,
          checks: qualityCheck.checks,
          checkedAt: new Date(),
        },
        config: {
          dryRun: options.dryRun || false,
          quality: options.quality || "medium",
          autoUpload: options.autoUpload !== false,
        },
        "stats.completedAt": new Date(),
        "stats.duration": (Date.now() - context.startTime) / 1000,
      },
    },
    { upsert: true, new: true }
  )

  context.mongoDoc = pipelineDoc
  log("INFO", "Step 13: MongoDB save complete", { jobId, status: pipelineDoc.status })
}

/**
 * Step 14: YouTube Upload (if autoUpload=true)
 */
const stepYouTubeUpload = async (context) => {
  const { options, localVideoPath, seo, jobId } = context

  if (options.dryRun) {
    log("INFO", "Step 14: Dry run — skipping YouTube upload", {
      wouldUpload: true,
      title: seo.title,
      videoFile: path.basename(localVideoPath),
    })
    context.youtubeResult = {
      uploaded: false,
      dryRun: true,
      wouldHaveUploaded: true,
    }
    return
  }

  if (!options.autoUpload) {
    log("INFO", "Step 14: autoUpload=false — skipping YouTube upload")
    context.youtubeResult = { uploaded: false, reason: "autoUpload=false" }
    return
  }

  if (!await isYouTubeAuthenticated()) {
    log("INFO", "Step 14: YouTube not authenticated — skipping upload")
    context.youtubeResult = { uploaded: false, reason: "YouTube not authenticated" }
    return
  }

  try {
    const payload = buildYouTubePayload(seo)

    const uploadResult = await retryWithBackoff(
      () => uploadVideoToYouTube({
        filePath: localVideoPath,
        title: payload.title,
        description: payload.description,
        tags: payload.tags,
        privacyStatus: payload.privacyStatus,
        categoryId: payload.categoryId,
      }),
      { name: "YouTube Upload", maxRetries: 2 }
    )

    context.youtubeResult = {
      uploaded: true,
      videoId: uploadResult.id,
      videoUrl: `https://youtube.com/shorts/${uploadResult.id}`,
    }

    // Update MongoDB with YouTube data
    if (context.mongoDoc) {
      await PoemPipeline.findOneAndUpdate(
        { jobId },
        {
          $set: {
            "youtube.videoId": uploadResult.id,
            "youtube.videoUrl": `https://youtube.com/shorts/${uploadResult.id}`,
            "youtube.uploadedAt": new Date(),
            "youtube.privacyStatus": payload.privacyStatus,
          },
        }
      )
    }

    log("INFO", "Step 14: YouTube upload complete", { videoId: uploadResult.id })
  } catch (err) {
    log("ERROR", "Step 14: YouTube upload failed", { error: err.message })
    context.youtubeResult = { uploaded: false, error: err.message }
  }
}

// ─── Step Runner ────────────────────────────────────────────────────────

const STEP_FUNCTIONS = [
  stepTopicSelection,     // 1
  stepPoemGeneration,     // 2
  stepSceneSplitting,     // 3
  stepImageGeneration,    // 4
  stepTTSVoiceover,       // 5
  stepBackgroundMusic,    // 6
  stepSubtitleGeneration, // 7
  stepVideoRendering,     // 8
  stepThumbnailGeneration,// 9
  stepSEOGeneration,      // 10
  stepQualityCheck,       // 11
  stepImageKitUpload,     // 12
  stepMongoDBSave,        // 13
  stepYouTubeUpload,      // 14
]

/**
 * Determine which step to resume from.
 * Checks the existing pipeline document in MongoDB.
 */
const getResumeStep = async (jobId) => {
  try {
    const existing = await PoemPipeline.findOne({ jobId }).lean()
    if (!existing) return 0

    // If status is 'failed', resume from last known step
    if (existing.status === "failed" || existing.status === "processing") {
      // Determine completed steps based on existing data
      let lastCompleted = 0
      if (existing.topic) lastCompleted = 1
      if (existing.poem?.lines?.length > 0) lastCompleted = 2
      if (existing.scenes?.length > 0) lastCompleted = 3
      // Steps 4-5 have no persistent indicator beyond scenes
      if (existing.audio?.ttsFile) lastCompleted = 5
      if (existing.video?.finalVideoUrl) lastCompleted = 8
      if (existing.video?.thumbnailUrl) lastCompleted = 9
      if (existing.seo?.title) lastCompleted = 10
      if (existing.qualityCheck?.checkedAt) lastCompleted = 11
      if (existing.youtube?.uploadedAt) lastCompleted = 14

      return lastCompleted
    }

    return 0
  } catch {
    return 0
  }
}

// ─── Main Pipeline Function ─────────────────────────────────────────────

/**
 * Run the complete Hindi Poem Shorts pipeline.
 *
 * @param {object} [options={}]
 * @param {string}  [options.jobId]          - Existing job ID for resume
 * @param {boolean} [options.dryRun=false]   - Skip YouTube upload, save locally
 * @param {boolean} [options.autoUpload=true] - Upload to YouTube
 * @param {string}  [options.quality="medium"] - Rendering quality
 * @param {string}  [options.customPoem]     - Custom poem text (skip AI generation)
 * @param {string}  [options.customTopic]    - Force a specific topic
 * @param {string}  [options.preferredCategory] - Preferred topic category
 * @returns {Promise<{jobId: string, status: string, videoUrl: string|null, youtubeUrl: string|null, ...}>}
 */
export const runHindiPoemPipeline = async (options = {}) => {
  const {
    jobId: existingJobId = null,
    dryRun = false,
    autoUpload = true,
    quality = "medium",
    customPoem = null,
    customTopic = null,
    preferredCategory = null,
  } = options

  const jobId = existingJobId || generateJobId()

  await acquireSlot()

  const startTime = Date.now()

  // Create or update MongoDB record
  try {
    await PoemPipeline.findOneAndUpdate(
      { jobId },
      {
        $setOnInsert: {
          jobId,
          status: "processing",
          config: { dryRun, quality, autoUpload },
          "stats.startedAt": new Date(),
        },
      },
      { upsert: true }
    )
  } catch (err) {
    log("WARN", "Could not create MongoDB record", { error: err.message })
  }

  // Initialize status tracking
  updateStatus(jobId, {
    status: "processing",
    currentStep: 0,
    currentStepLabel: "Starting...",
    progress: 0,
    logs: ["Pipeline started"],
  })

  ensureDirectories()

  log("INFO", "Pipeline started", {
    jobId,
    dryRun,
    autoUpload,
    quality,
    hasCustomPoem: !!customPoem,
    hasCustomTopic: !!customTopic,
  })

  try {
    // Check for resume
    const resumeFrom = existingJobId ? await getResumeStep(jobId) : 0
    if (resumeFrom > 0) {
      log("INFO", "Resuming pipeline from step", { resumeFrom, jobId })
    }

    // Build shared context
    const context = {
      jobId,
      options: { dryRun, autoUpload, quality, customPoem, customTopic, preferredCategory },
      customPoem,
      customTopic,
      preferredCategory,
      startTime,
      topic: null,
      category: null,
      poem: null,
      scenes: [],
      sceneImages: [],
      audioPath: null,
      audioImageKitUrl: null,
      backgroundMusic: null,
      subtitlePath: null,
      srtContent: null,
      localVideoPath: null,
      renderedVideoPath: null,
      thumbnailPath: null,
      thumbnailImageKitUrl: null,
      seo: null,
      qualityCheck: null,
      imageKitUrls: {},
      youtubeResult: null,
      mongoDoc: null,
    }

    // Execute steps sequentially
    for (let i = 0; i < STEP_FUNCTIONS.length; i++) {
      const stepNum = i + 1

      // Skip steps before resume point
      if (stepNum <= resumeFrom) {
        log("INFO", `Skipping step ${stepNum} (${STEP_LABELS[i]}) — already completed`)
        continue
      }

      const progress = Math.round((stepNum / TOTAL_STEPS) * 100)

      updateStatus(jobId, {
        currentStep: stepNum,
        currentStepLabel: STEP_LABELS[i],
        progress,
        logs: [`Step ${stepNum}/${TOTAL_STEPS}: ${STEP_LABELS[i]}`],
      })

      log("INFO", `Step ${stepNum}/${TOTAL_STEPS}: ${STEP_LABELS[i]}...`)

      const stepStart = Date.now()
      await executeStep(STEP_LABELS[i], () => STEP_FUNCTIONS[i](context))
      const stepDuration = ((Date.now() - stepStart) / 1000).toFixed(2)

      log("INFO", `Step ${stepNum}/${TOTAL_STEPS}: ${STEP_LABELS[i]} complete`, { duration: `${stepDuration}s` })

      // Save state to MongoDB after each step (best-effort)
      try {
        await PoemPipeline.findOneAndUpdate(
          { jobId },
          {
            $set: {
              status: "processing",
              topic: context.topic,
              "stats.retryCount": 0,
            },
          }
        )
      } catch {
        // non-blocking
      }
    }

    // ── Record topic usage ──────────────────────────────────────────
    if (context.topic) {
      try {
        await recordTopicUsage(context.topic, jobId, context.category, true)
      } catch {
        // non-blocking
      }
    }

    const totalDuration = ((Date.now() - startTime) / 1000).toFixed(2)

    // ── Final status update ─────────────────────────────────────────
    updateStatus(jobId, {
      status: "completed",
      currentStep: TOTAL_STEPS,
      currentStepLabel: "Completed",
      progress: 100,
      result: {
        jobId,
        topic: context.topic,
        category: context.category,
        poemTitle: context.poem?.title,
        sceneCount: context.scenes?.length,
        videoFile: context.localVideoPath ? path.basename(context.localVideoPath) : null,
        thumbnailFile: context.thumbnailPath ? path.basename(context.thumbnailPath) : null,
        seoTitle: context.seo?.title,
        qualityPassed: context.qualityCheck?.passed,
        youtube: context.youtubeResult,
        dryRun,
        imageKitUrls: context.imageKitUrls,
      },
      logs: [`Pipeline completed in ${totalDuration}s`],
    })

    log("INFO", "Pipeline completed", {
      jobId,
      duration: `${totalDuration}s`,
      topic: context.topic,
      qualityPassed: context.qualityCheck?.passed,
      youtubeUploaded: context.youtubeResult?.uploaded || false,
    })

    // Clean up temp files (but keep final outputs)
    cleanupJobFiles(jobId)

    return {
      jobId,
      status: dryRun ? "dry-run" : "completed",
      topic: context.topic,
      category: context.category,
      poem: {
        title: context.poem?.title,
        lineCount: context.poem?.lineCount,
      },
      scenes: context.scenes?.length || 0,
      videoUrl: context.imageKitUrls.video || (context.localVideoPath ? path.basename(context.localVideoPath) : null),
      thumbnailUrl: context.imageKitUrls.thumbnail || (context.thumbnailPath ? path.basename(context.thumbnailPath) : null),
      youtubeUrl: context.youtubeResult?.videoUrl || null,
      seo: context.seo,
      qualityCheck: context.qualityCheck,
      dryRun,
      duration: totalDuration,
    }
  } catch (error) {
    const totalDuration = ((Date.now() - startTime) / 1000).toFixed(2)

    log("ERROR", "Pipeline failed", {
      jobId,
      error: error.message,
      duration: `${totalDuration}s`,
    })

    // Record topic as failed
    if (context?.topic) {
      try {
        await recordTopicUsage(context.topic, jobId, context.category || "general", false)
      } catch {
        // non-blocking
      }
    }

    // Update MongoDB
    try {
      await PoemPipeline.findOneAndUpdate(
        { jobId },
        {
          $set: {
            status: "failed",
            "stats.lastError": error.message,
            "stats.completedAt": new Date(),
            "stats.duration": totalDuration,
          },
        }
      )
    } catch {
      // non-blocking
    }

    updateStatus(jobId, {
      status: "failed",
      error: error.message,
      logs: [`Pipeline failed: ${error.message}`],
    })

    // Cleanup on failure
    cleanupJobFiles(jobId)

    throw error
  } finally {
    releaseSlot()
  }
}

/**
 * Get pipeline stats for monitoring.
 */
export const getPipelineStats = async () => {
  try {
    const [total, completed, failed, dryRun] = await Promise.all([
      PoemPipeline.countDocuments(),
      PoemPipeline.countDocuments({ status: "completed" }),
      PoemPipeline.countDocuments({ status: "failed" }),
      PoemPipeline.countDocuments({ status: "dry-run" }),
    ])

    return { total, completed, failed, dryRun, active: activeCount }
  } catch {
    return { total: 0, completed: 0, failed: 0, dryRun: 0, active: activeCount }
  }
}

/**
 * List recent pipelines (for dashboard).
 */
export const listRecentPipelines = async (limit = 10) => {
  try {
    return await PoemPipeline.find()
      .sort({ createdAt: -1 })
      .limit(limit)
      .select("jobId status topic poem.title seo.title config createdAt stats.duration youtube.videoId")
      .lean()
  } catch {
    return []
  }
}

export default {
  runHindiPoemPipeline,
  getPipelineStatus,
  getActivePipelines,
  getPipelineStats,
  listRecentPipelines,
}
