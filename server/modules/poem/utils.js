/**
 * Shared utilities for the poem pipeline.
 */

import fs from "fs"
import { log as logger } from "../../utils/logger.js"

const log = (level, msg, data = {}) => logger(level, `[POEM-UTIL] ${msg}`, data)

/**
 * Safely delete an array of file paths. Never throws — logs failures.
 */
export const cleanupTempFiles = (files) => {
  for (const file of files) {
    try {
      if (file && fs.existsSync(file)) fs.unlinkSync(file)
    } catch (err) {
      log("WARN", "Failed to cleanup temp file", { file, error: err.message })
    }
  }
}

/**
 * Format seconds into "M:SS" display string.
 */
export const formatDuration = (seconds) => {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, "0")}`
}

/**
 * Track pipeline performance metrics (in-memory, resets on restart).
 */
const pipelineMetrics = {
  totalRuns: 0,
  successCount: 0,
  failureCount: 0,
  averageDuration: 0,
  stepDurations: {},
}

export const trackPipelineMetric = (jobId, step, duration, success) => {
  pipelineMetrics.totalRuns++
  if (success) pipelineMetrics.successCount++
  else pipelineMetrics.failureCount++

  pipelineMetrics.averageDuration =
    (pipelineMetrics.averageDuration * (pipelineMetrics.totalRuns - 1) + duration) /
    pipelineMetrics.totalRuns

  if (!pipelineMetrics.stepDurations[step]) {
    pipelineMetrics.stepDurations[step] = { total: 0, count: 0 }
  }
  pipelineMetrics.stepDurations[step].total += duration
  pipelineMetrics.stepDurations[step].count++

  log("INFO", "Pipeline metric", { jobId, step, duration: `${duration.toFixed(2)}s`, success })
}

export const getPipelineMetrics = () => ({ ...pipelineMetrics })

/**
 * Resolve a render result (union of string | object) to its videoPath and
 * localVideoPath, handling both old and new return shapes.
 */
export const resolveRenderPaths = (renderResult) => {
  if (typeof renderResult === "string") {
    return { finalVideo: renderResult, localVideoPath: renderResult }
  }
  return {
    finalVideo: renderResult.videoPath,
    localVideoPath: renderResult.localVideoPath || renderResult.videoPath,
  }
}

/**
 * Resolve an audio/video result (union of string | object) to its file path.
 */
export const resolveMediaPath = (result) => {
  return typeof result === "string" ? result : result.path
}
