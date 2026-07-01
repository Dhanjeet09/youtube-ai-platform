import express from "express"
import { createVideoPipeline, runFullPipeline, runWorldCupPipeline, getPipelineStatus } from "./pipelineService.js"
import { renderVideo } from "./renderService.js"
import { asyncHandler } from "../middleware/asyncHandler.js"
import { log as logger } from "../utils/logger.js"

const generateJobId = () => `pipeline-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

const router = express.Router()

/**
 * Run the pipeline in the background (non-blocking) so the API returns
 * immediately with a jobId. The client polls GET /status/:jobId for progress.
 *
 * BUG-002 FIX: Previously the handler awaited the full pipeline (minutes),
 * causing HTTP timeouts on the client and making the polling mechanism useless.
 */
const startPipelineInBackground = async (options) => {
  try {
    await createVideoPipeline(options)
  } catch (err) {
    logger("ERROR", "[PIPELINE] Background pipeline failed", {
      jobId: options.jobId,
      error: err.message
    })
  }
}

/**
 * Validate common pipeline fields.
 */
function validatePipelineInput(body) {
  const { forceNiche, videoType, language, script, audioPath, videoPath } = body
  const errors = []

  if (forceNiche !== undefined && forceNiche !== null) {
    if (typeof forceNiche !== "string" || !forceNiche.trim()) {
      errors.push("forceNiche must be a non-empty string if provided")
    } else if (forceNiche.trim().length > 100) {
      errors.push("forceNiche must not exceed 100 characters")
    }
  }

  if (videoType && !["short", "long"].includes(videoType)) {
    errors.push("videoType must be 'short' or 'long'")
  }

  if (language !== undefined && language !== null) {
    if (typeof language !== "string") {
      errors.push("language must be a string")
    } else if (language.trim().length > 50) {
      errors.push("language must not exceed 50 characters")
    }
  }

  if (script !== undefined && script !== null) {
    if (typeof script !== "string") {
      errors.push("script must be a string if provided")
    } else if (script.trim().length > 10000) {
      errors.push("script must not exceed 10000 characters")
    }
  }

  if (audioPath !== undefined && audioPath !== null) {
    if (typeof audioPath !== "string") {
      errors.push("audioPath must be a string if provided")
    } else if (audioPath.trim().length > 500) {
      errors.push("audioPath must not exceed 500 characters")
    }
  }

  if (videoPath !== undefined && videoPath !== null) {
    if (typeof videoPath !== "string") {
      errors.push("videoPath must be a string if provided")
    } else if (videoPath.trim().length > 500) {
      errors.push("videoPath must not exceed 500 characters")
    }
  }

  return errors
}

router.post("/create", asyncHandler(async (req, res) => {
  const validationErrors = validatePipelineInput(req.body)
  if (validationErrors.length > 0) {
    return res.status(400).json({ success: false, message: validationErrors.join("; ") })
  }

  const { forceNiche, videoType, language, script, generateThumbnail, thumbnailTimestamp, audioPath, videoPath } = req.body

  const jobId = generateJobId()

  // BUG-002 FIX: Fire pipeline in background — return immediately with jobId
  startPipelineInBackground({
    forceNiche,
    videoType,
    language,
    script: script || undefined,
    generateThumbnail: generateThumbnail !== false, // default true
    thumbnailTimestamp,
    // Pre-generated assets from frontend steps 3-4
    preGeneratedAudioPath: audioPath || undefined,
    preGeneratedVideoPath: videoPath || undefined,
    jobId
  })

  res.json({
    success: true,
    data: {
      jobId,
      status: "processing",
      message: "Pipeline started. Poll GET /api/pipeline/status/:jobId for progress."
    }
  })
}))

router.post("/run", asyncHandler(async (req, res) => {
  const validationErrors = validatePipelineInput(req.body)
  if (validationErrors.length > 0) {
    return res.status(400).json({ success: false, message: validationErrors.join("; ") })
  }

  const { forceNiche, videoType, language, script, generateThumbnail, thumbnailTimestamp } = req.body

  const result = await runFullPipeline({
    forceNiche,
    videoType,
    language,
    script: script || undefined,
    generateThumbnail: generateThumbnail !== false,
    thumbnailTimestamp
  })

  res.json({
    success: true,
    data: result
  })
}))

router.get("/status/:jobId", asyncHandler(async (req, res) => {
  const { jobId } = req.params

  if (!jobId || jobId.length < 8) {
    return res.status(400).json({
      success: false,
      message: "Invalid jobId parameter"
    })
  }

  const status = getPipelineStatus(jobId)

  if (!status) {
    return res.status(404).json({
      success: false,
      message: "Pipeline job not found"
    })
  }

  res.json({
    success: true,
    data: status
  })
}))

router.post("/worldcup", asyncHandler(async (req, res) => {
  const { matchId, templateId, language, quality } = req.body

  if (!matchId && !templateId) {
    return res.status(400).json({
      success: false,
      message: "At least one of matchId or templateId is required"
    })
  }

  if (matchId && (typeof matchId !== "string" || matchId.trim().length > 100)) {
    return res.status(400).json({ success: false, message: "matchId must be a string not exceeding 100 characters" })
  }
  if (templateId && (typeof templateId !== "string" || templateId.trim().length > 100)) {
    return res.status(400).json({ success: false, message: "templateId must be a string not exceeding 100 characters" })
  }
  if (language && (typeof language !== "string" || language.trim().length > 50)) {
    return res.status(400).json({ success: false, message: "language must be a string not exceeding 50 characters" })
  }

  const result = await runWorldCupPipeline({
    matchId: matchId?.trim(),
    templateId: templateId?.trim(),
    language: language?.trim(),
    quality
  })

  res.json({
    success: true,
    data: result
  })
}))

router.post("/video", asyncHandler(async (req, res) => {
  const { audioPath, videoPath, script, quality, generateSubtitles } = req.body

  if (!audioPath || typeof audioPath !== "string" || !audioPath.trim()) {
    return res.status(400).json({ success: false, message: "audioPath is required and must be a non-empty string" })
  }
  if (audioPath.trim().length > 500) {
    return res.status(400).json({ success: false, message: "audioPath must not exceed 500 characters" })
  }

  if (!videoPath || typeof videoPath !== "string" || !videoPath.trim()) {
    return res.status(400).json({ success: false, message: "videoPath is required and must be a non-empty string" })
  }
  if (videoPath.trim().length > 500) {
    return res.status(400).json({ success: false, message: "videoPath must not exceed 500 characters" })
  }

  if (!script || typeof script !== "string" || !script.trim()) {
    return res.status(400).json({ success: false, message: "script is required and must be a non-empty string" })
  }
  if (script.trim().length > 10000) {
    return res.status(400).json({ success: false, message: "script must not exceed 10000 characters" })
  }

  if (quality !== undefined && (typeof quality !== "string" || quality.trim().length > 20)) {
    return res.status(400).json({ success: false, message: "quality must be a string not exceeding 20 characters" })
  }

  const renderResult = await renderVideo(audioPath.trim(), videoPath.trim(), script.trim(), {
    quality: quality?.trim(),
    generateSubtitles: generateSubtitles !== false
  })

  // renderResult is { videoPath, subtitlePath }
  const resultPath = typeof renderResult === "string" ? renderResult : renderResult.videoPath
  const resultSubs = typeof renderResult === "string" ? null : renderResult.subtitlePath

  res.json({
    success: true,
    data: {
      videoPath: resultPath,
      subtitlePath: resultSubs
    }
  })
}))

export default router
