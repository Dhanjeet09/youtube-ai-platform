import cron from "node-cron"
import fs from "fs"
import { createVideoPipeline, runWorldCupPipeline } from "../pipeline/pipelineService.js"
import { uploadVideoToYouTube } from "../modules/upload/service.js"
import { registerVideoPerformance, updateNichePerformance } from "../niche/nicheService.js"
import { retryWithBackoff } from "../utils/retry.js"
import { log as logger } from "../utils/logger.js"
import { ContentQueue, MatchEvent, ContentTemplate } from "../database/models/index.js"

const MAX_RETRIES = 3

// ─── Scheduler State ──────────────────────────────────────────────
let schedulerEnabled = process.env.SERVERLESS !== "true"
const cronTasks = []

const SCHEDULE_TIMES_IST = ["10:00 AM", "2:00 PM", "6:00 PM"]
const SCHEDULE_CRON = ["0 10 * * *", "0 14 * * *", "0 18 * * *"]

const log = (level, message, data = {}) => logger(level, `[SCHEDULER] ${message}`, data)

/**
 * Calculate next run time based on scheduled times (10 AM, 2 PM, 6 PM IST).
 * Uses Asia/Kolkata timezone offset (UTC+5:30).
 */
const calculateNextRun = () => {
  const now = new Date()
  // Convert current time to IST
  const istOffset = 5.5 * 60 * 60 * 1000
  const nowIST = new Date(now.getTime() + istOffset)
  const currentHour = nowIST.getUTCHours()
  const currentMinutes = nowIST.getUTCMinutes()

  const scheduleHours = [10, 14, 18]
  const scheduleMinutes = [0, 0, 0]

  for (let i = 0; i < scheduleHours.length; i++) {
    if (currentHour < scheduleHours[i] || (currentHour === scheduleHours[i] && currentMinutes < scheduleMinutes[i])) {
      const next = new Date(nowIST)
      next.setUTCHours(scheduleHours[i], scheduleMinutes[i], 0, 0)
      // Convert back to local time
      return new Date(next.getTime() - istOffset).toISOString()
    }
  }

  // All passed today — return first slot tomorrow
  const tomorrow = new Date(nowIST)
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1)
  tomorrow.setUTCHours(scheduleHours[0], scheduleMinutes[0], 0, 0)
  return new Date(tomorrow.getTime() - istOffset).toISOString()
}

export const getStatus = () => ({
  enabled: schedulerEnabled,
  nextRun: calculateNextRun(),
  schedule: `${SCHEDULE_TIMES_IST.join(", ")} IST`,
  worldCupMode: process.env.WORLD_CUP_MODE === "true"
})

export const toggle = () => {
  schedulerEnabled = !schedulerEnabled

  if (schedulerEnabled) {
    // Restart all cron tasks
    cronTasks.forEach(task => {
      try { task.start() } catch (e) { log("ERROR", "Failed to start cron", { error: e.message }) }
    })
    log("INFO", "Scheduler enabled")
  } else {
    // Stop all cron tasks
    cronTasks.forEach(task => {
      try { task.stop() } catch (e) { log("ERROR", "Failed to stop cron", { error: e.message }) }
    })
    log("INFO", "Scheduler disabled")
  }

  return getStatus()
}

const uploadWithRetry = async (filePath, title, tags) => {
  return retryWithBackoff(
    async () => {
      log("INFO", "Upload attempt", { fileExists: true }) // 🔴 FIX: removed file path from log
      const result = await uploadVideoToYouTube({
        filePath,
        title,
        description: title,
        tags,
        privacyStatus: "public"
      })
      log("INFO", "Upload successful", { videoId: result.id })
      return result
    },
    { maxRetries: MAX_RETRIES, baseDelay: 5000, name: "upload" }
  )
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

    await registerVideoPerformance(niche, upload.id)
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

// ============================================
// World Cup / Match-Driven Content Scheduling
// ============================================

const QUEUE_PRIORITIES = {
  POST_MATCH: 5,
  PRE_MATCH: 4,
  DAILY_PREVIEW: 3,
  BATCH_CONTENT: 2
}

const PRE_MATCH_LEAD_TIME_MS = 60 * 60 * 1000   // 60 minutes before kickoff
const MATCH_DURATION_MS = 105 * 60 * 1000        // 90 + 15 min stoppage/extra
const MAX_CONCURRENT_PIPELINES = 2
const QUEUE_POLL_INTERVAL_MS = 2 * 60 * 1000     // every 2 minutes
const MATCH_POLL_INTERVAL_MS = 5 * 60 * 1000     // every 5 minutes

/**
 * Generate a unique job ID for ContentQueue entries.
 */
const generateJobId = (prefix) =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

/**
 * scheduleWorldCupContent()
 * Queries ContentTemplate for active World Cup templates,
 * queries MatchEvent for today's matches, and creates ContentQueue entries:
 *   - 1 pre-match prediction video  (priority 4)
 *   - 1 post-match result video     (priority 5)
 *   - 2-3 surprise stat/moment shorts (priority 5)
 *   - 1 daily match preview         (priority 3)
 *
 * Idempotent — safe to call multiple times per day.
 */
export const scheduleWorldCupContent = async () => {
  log("INFO", "scheduleWorldCupContent started")
  const overallStart = Date.now()

  try {
    // 1. Gather all active World-Cup-related templates
    const templates = await ContentTemplate.find({
      category: {
        $in: [
          "match-result", "match-prediction", "player-fact",
          "surprise-stat", "top-moments", "tactical-analysis",
          "match-preview", "match-breakdown", "top-performers",
          "weekly-recap", "tournament-storylines", "debate"
        ]
      }
    })
      .limit(50)
      .lean()

    if (!templates.length) {
      log("WARN", "No World Cup content templates found — skipping scheduling")
      return { scheduled: 0 }
    }

    // 2. Find matches scheduled for today
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    const todayEnd = new Date()
    todayEnd.setHours(23, 59, 59, 999)

    const matches = await MatchEvent.find({
      kickoffTime: { $gte: todayStart, $lte: todayEnd }
    }, {
      team1: 1, team2: 1, score1: 1, score2: 1,
      status: 1, stage: 1, kickoffTime: 1, goals: 1, stats: 1
    })
      .limit(50)
      .lean()

    if (!matches.length) {
      log("INFO", "No World Cup matches scheduled for today")
      return { scheduled: 0 }
    }

    log("INFO", `Found ${matches.length} match(es) and ${templates.length} template(s)`)

    // Helper: pick N unique templates from a pool
    const pickTemplates = (categories, count) => {
      const pool = templates.filter(t => categories.includes(t.category))
      const picked = []
      for (let i = 0; i < Math.min(count, pool.length); i++) {
        picked.push(pool[i])
      }
      return picked
    }

    // --- Bulk check: find which matches already have content scheduled today ---
    const existingCounts = await ContentQueue.aggregate([
      { $match: { match: { $in: matches.map(m => m._id) }, createdAt: { $gte: todayStart } } },
      { $group: { _id: "$match", count: { $sum: 1 } } }
    ])
    const existingMap = {}
    existingCounts.forEach(item => { existingMap[item._id.toString()] = item.count })

    let scheduledCount = 0

    for (const match of matches) {
      const matchId = match.matchId || String(match._id)

      // --- skip if we have already scheduled content for this match today ---
      const existingForMatch = existingMap[match._id.toString()] || 0
      if (existingForMatch > 0) {
        log("INFO", `Content already scheduled for match ${matchId} (${existingForMatch} entries) — skipping`)
        continue
      }

      // -------------------------------------------------------
      // A) Pre-match prediction  (60 min before kickoff)
      // -------------------------------------------------------
      const predictionTmpl = templates.find(t => t.category === "match-prediction")
      if (predictionTmpl) {
        await ContentQueue.create({
          jobId: generateJobId(`pre-${matchId}`),
          type: "short",
          template: predictionTmpl._id,
          match: match._id,
          vars: {
            team1: match.team1,
            team2: match.team2,
            stage: match.stage,
            kickoffTime: match.kickoffTime
          },
          priority: QUEUE_PRIORITIES.PRE_MATCH
        })
        scheduledCount++
      }

      // -------------------------------------------------------
      // B) Post-match result  (only if already finished)
      // -------------------------------------------------------
      if (match.status === "finished") {
        const resultTmpl = templates.find(t => t.category === "match-result")
        if (resultTmpl) {
          await ContentQueue.create({
            jobId: generateJobId(`post-${matchId}`),
            type: "short",
            template: resultTmpl._id,
            match: match._id,
            vars: {
              team1: match.team1,
              team2: match.team2,
              score1: match.score1,
              score2: match.score2,
              goals: match.goals || []
            },
            priority: QUEUE_PRIORITIES.POST_MATCH
          })
          scheduledCount++
        }

        // C) 2-3 surprise stat / moment shorts
        const statTemplates = pickTemplates(
          ["surprise-stat", "player-fact", "top-moments", "tactical-analysis"],
          3
        )
        for (let i = 0; i < statTemplates.length; i++) {
          await ContentQueue.create({
            jobId: generateJobId(`stat-${matchId}-${i}`),
            type: "short",
            template: statTemplates[i]._id,
            match: match._id,
            vars: {
              team1: match.team1,
              team2: match.team2,
              score1: match.score1,
              score2: match.score2,
              stats: match.stats || {},
              goals: match.goals || [],
              highlightIndex: i
            },
            priority: QUEUE_PRIORITIES.POST_MATCH
          })
          scheduledCount++
        }
      }

      // -------------------------------------------------------
      // D) Daily match preview (morning of match day)
      // -------------------------------------------------------
      const previewTmpl = templates.find(t => ["match-preview", "match-breakdown"].includes(t.category))
      if (previewTmpl) {
        await ContentQueue.create({
          jobId: generateJobId(`preview-${matchId}`),
          type: "short",
          template: previewTmpl._id,
          match: match._id,
          vars: {
            team1: match.team1,
            team2: match.team2,
            stage: match.stage,
            kickoffTime: match.kickoffTime
          },
          priority: QUEUE_PRIORITIES.DAILY_PREVIEW
        })
        scheduledCount++
      }
    }

    const duration = ((Date.now() - overallStart) / 1000).toFixed(2)
    log("INFO", "scheduleWorldCupContent completed", {
      scheduled: scheduledCount,
      duration: `${duration}s`
    })

    return { scheduled: scheduledCount }

  } catch (error) {
    log("ERROR", "scheduleWorldCupContent failed", { error: error.message })
    throw error
  }
}

/**
 * processContentQueue()
 * Queries ContentQueue for queued items ordered by priority (desc) and
 * createdAt (asc). Processes them sequentially with max 2 concurrent
 * pipeline runs.  Updates status to processing → completed / failed.
 */
export const processContentQueue = async () => {
  log("INFO", "processContentQueue started")

  try {
    const items = await ContentQueue.find({ status: "queued" })
      .sort({ priority: -1, createdAt: 1 })
      .limit(MAX_CONCURRENT_PIPELINES * 2)
      .populate("template")
      .lean()

    if (!items.length) {
      log("INFO", "No queued items to process")
      return { processed: 0 }
    }

    log("INFO", `Found ${items.length} queued item(s), processing up to ${MAX_CONCURRENT_PIPELINES} concurrently`)

    const running = []
    for (const item of items) {
      if (running.length >= MAX_CONCURRENT_PIPELINES) break
      running.push(
        processSingleQueueItem(item).catch(err => {
          log("ERROR", "Queue item processing failed", { jobId: item.jobId, error: err.message })
        })
      )
    }

    await Promise.all(running)

    log("INFO", "processContentQueue completed", { processed: running.length })
    return { processed: running.length }

  } catch (error) {
    log("ERROR", "processContentQueue failed", { error: error.message })
    throw error
  }
}

/**
 * Process a single ContentQueue entry — runs the appropriate pipeline
 * and updates the status accordingly.
 */
const processSingleQueueItem = async (item) => {
  const startTime = Date.now()
  log("INFO", "Processing queue item", { jobId: item.jobId, priority: item.priority })

  // Mark as processing
  await ContentQueue.updateOne(
    { _id: item._id },
    { $set: { status: "processing", startedAt: new Date() } }
  )

  try {
    let result

    if (item.match) {
      // World Cup / match-driven pipeline
      const matchData = await MatchEvent.findById(item.match, {
        matchId: 1, team1: 1, team2: 1, score1: 1, score2: 1,
        status: 1, stage: 1, kickoffTime: 1, goals: 1, stats: 1
      }).lean()
      result = await runWorldCupPipeline({
        matchId: matchData?.matchId,
        templateId: item.template?._id,
        quality: "medium"
      })
    } else {
      // Standard content pipeline
      result = await createVideoPipeline({ quality: "medium" })
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2)

    await ContentQueue.updateOne(
      { _id: item._id },
      {
        $set: {
          status: "completed",
          completedAt: new Date(),
          pipelineResult: {
            topic: result.topic,
            title: result.title,
            videoId: result.videoId,
            niche: result.niche,
            finalVideo: result.finalVideo,
            duration: `${duration}s`
          }
        }
      }
    )

    log("INFO", "Queue item completed", {
      jobId: item.jobId,
      duration: `${duration}s`,
      title: result.title
    })

    return result

  } catch (error) {
    const duration = ((Date.now() - startTime) / 1000).toFixed(2)

    await ContentQueue.updateOne(
      { _id: item._id },
      {
        $set: {
          status: "failed",
          completedAt: new Date(),
          error: error.message
        }
      }
    )

    log("ERROR", "Queue item failed", {
      jobId: item.jobId,
      error: error.message,
      duration: `${duration}s`
    })

    throw error
  }
}

/**
 * pollMatchStatuses()
 * Runs every 5 minutes during known match windows.
 */
export const pollMatchStatuses = async () => {
  log("INFO", "pollMatchStatuses started")

  try {
    const now = new Date()
    const preMatchWindowEnd = new Date(now.getTime() + PRE_MATCH_LEAD_TIME_MS)

    // Find scheduled matches kicking off within the next 60 minutes
    const upcomingMatches = await MatchEvent.find({
      status: "scheduled",
      kickoffTime: { $gte: now, $lte: preMatchWindowEnd }
    }, {
      team1: 1, team2: 1, score1: 1, score2: 1,
      status: 1, stage: 1, kickoffTime: 1, goals: 1, stats: 1
    })
      .sort({ kickoffTime: 1 })
      .limit(50)
      .lean()

    if (!upcomingMatches.length) {
      log("INFO", "No matches approaching kickoff")
      return { polled: 0 }
    }

    log("INFO", `Found ${upcomingMatches.length} match(es) approaching kickoff`)
    let polledCount = 0

    for (const match of upcomingMatches) {
      const kickoff = new Date(match.kickoffTime).getTime()
      const minutesUntilKickoff = Math.round((kickoff - now.getTime()) / 60000)

      // Only create pre-match content if we haven't already
      const existingPre = await ContentQueue.countDocuments({
        match: match._id,
        jobId: { $regex: `^pre-${match.matchId}` }
      })

      if (existingPre === 0) {
        log("INFO", "Queueing pre-match content via poll", {
          match: `${match.team1} vs ${match.team2}`,
          minutesUntilKickoff
        })

        const predictionTmpl = await ContentTemplate.findOne({ category: "match-prediction" }).lean()
        if (predictionTmpl) {
          await ContentQueue.create({
            jobId: generateJobId(`pre-${match.matchId}`),
            type: "short",
            template: predictionTmpl._id,
            match: match._id,
            vars: {
              team1: match.team1,
              team2: match.team2,
              stage: match.stage,
              minutesUntilKickoff
            },
            priority: QUEUE_PRIORITIES.PRE_MATCH
          })
          polledCount++
        }

        const previewTmpl = await ContentTemplate.findOne({
          category: { $in: ["match-preview", "match-breakdown"] }
        }).lean()
        if (previewTmpl) {
          await ContentQueue.create({
            jobId: generateJobId(`preview-${match.matchId}`),
            type: "short",
            template: previewTmpl._id,
            match: match._id,
            vars: {
              team1: match.team1,
              team2: match.team2,
              stage: match.stage,
              kickoffTime: match.kickoffTime
            },
            priority: QUEUE_PRIORITIES.DAILY_PREVIEW
          })
          polledCount++
        }
      }

      // Check if match has exceeded expected duration and is still "scheduled"
      const msSinceKickoff = now.getTime() - kickoff
      if (msSinceKickoff > MATCH_DURATION_MS && match.status === "scheduled") {
        log("INFO", "Match exceeded expected duration — awaiting webhook update", {
          match: `${match.team1} vs ${match.team2}`
        })
      }
    }

    log("INFO", "pollMatchStatuses completed", { polled: polledCount })
    return { polled: polledCount }

  } catch (error) {
    log("ERROR", "pollMatchStatuses failed", { error: error.message })
    throw error
  }
}

/**
 * scheduleWeeklyRecap()
 * Queues a weekly World Cup recap every Sunday.
 */
export const scheduleWeeklyRecap = async () => {
  log("INFO", "scheduleWeeklyRecap started")

  try {
    const recapTemplate = await ContentTemplate.findOne({ category: "weekly-recap" }).lean()
    const storyTemplate = await ContentTemplate.findOne({ category: "tournament-storylines" }).lean()

    let scheduled = 0

    // Find all matches that finished this week
    const weekAgo = new Date()
    weekAgo.setDate(weekAgo.getDate() - 7)

    const finishedMatches = await MatchEvent.find({
      status: "finished",
      finishedTime: { $gte: weekAgo }
    }, {
      team1: 1, team2: 1, score1: 1, score2: 1,
      status: 1, stage: 1, finishedTime: 1, goals: 1
    })
      .sort({ finishedTime: -1 })
      .limit(100)
      .lean()

    if (!finishedMatches.length) {
      log("INFO", "No matches finished in the past week — skipping weekly recap")
      return { scheduled: 0 }
    }

    // Create batch recap entry
    if (recapTemplate) {
      await ContentQueue.create({
        jobId: generateJobId("weekly-recap"),
        type: "long",
        template: recapTemplate._id,
        vars: {
          matches: finishedMatches.map(m => ({
            team1: m.team1,
            team2: m.team2,
            score1: m.score1,
            score2: m.score2,
            stage: m.stage
          })),
          totalMatches: finishedMatches.length
        },
        priority: QUEUE_PRIORITIES.BATCH_CONTENT
      })
      scheduled++
    }

    if (storyTemplate) {
      await ContentQueue.create({
        jobId: generateJobId("tournament-story"),
        type: "long",
        template: storyTemplate._id,
        vars: {
          matches: finishedMatches.map(m => ({
            team1: m.team1,
            team2: m.team2,
            score1: m.score1,
            score2: m.score2,
            stage: m.stage,
            goals: (m.goals || []).slice(0, 5)
          })),
          totalMatches: finishedMatches.length
        },
        priority: QUEUE_PRIORITIES.BATCH_CONTENT
      })
      scheduled++
    }

    log("INFO", "scheduleWeeklyRecap completed", { scheduled })
    return { scheduled }

  } catch (error) {
    log("ERROR", "scheduleWeeklyRecap failed", { error: error.message })
    throw error
  }
}

// ============================================
// Scheduler Bootstrap
// ============================================

/**
 * Helper to create and track a cron task. If the scheduler is currently
 * disabled, the task is created in a stopped state.
 */
const addCronTask = (expression, fn, options) => {
  const task = cron.schedule(expression, fn, { ...options, scheduled: schedulerEnabled })
  cronTasks.push(task)
  return task
}

export const startScheduler = () => {
  if (process.env.SERVERLESS === "true") {
    schedulerEnabled = false
    log("INFO", "Running in serverless mode - scheduler disabled. Use POST /api/pipeline/run to trigger manually.")
    return
  }

  // Guard against double-init: clear existing tasks before re-populating
  cronTasks.length = 0

  const mode = process.env.WORLD_CUP_MODE === "true" ? "World Cup" : "Standard"
  const tzOptions = { timezone: "Asia/Kolkata" }

  // ─── Existing fixed cron slots ─────────────────────────────────────────
  addCronTask("0 10 * * *", () => runJob("MORNING").catch(() => {}), tzOptions)
  addCronTask("0 14 * * *", () => runJob("AFTERNOON").catch(() => {}), tzOptions)
  addCronTask("0 18 * * *", () => runJob("EVENING").catch(() => {}), tzOptions)
  log("INFO", `Scheduler started — ${mode} mode (10 AM, 2 PM, 6 PM IST)`)

  // ─── World Cup / Match-driven additions ───────────────────────────────
  addCronTask(
    "0 6 * * *",
    () => {
      if (process.env.WORLD_CUP_MODE !== "true") return
      scheduleWorldCupContent().catch(err =>
        log("ERROR", "Daily World Cup scheduling failed", { error: err.message })
      )
    },
    tzOptions
  )

  // Weekly recap every Sunday at 7 AM IST
  addCronTask(
    "0 7 * * 0",
    () => {
      if (process.env.WORLD_CUP_MODE !== "true") return
      scheduleWeeklyRecap().catch(err =>
        log("ERROR", "Weekly recap scheduling failed", { error: err.message })
      )
    },
    tzOptions
  )

  // Content Queue processor — runs every 2 minutes
  addCronTask(
    "*/2 * * * *",
    () => {
      processContentQueue().catch(err =>
        log("ERROR", "processContentQueue failed", { error: err.message })
      )
    },
    tzOptions
  )

  // Match status poller — runs every 5 minutes, only active in WC mode
  addCronTask(
    "*/5 * * * *",
    () => {
      if (process.env.WORLD_CUP_MODE !== "true") return
      pollMatchStatuses().catch(err =>
        log("ERROR", "pollMatchStatuses failed", { error: err.message })
      )
    },
    tzOptions
  )

  log("INFO", "World Cup scheduler extensions active", {
    worldCupMode: process.env.WORLD_CUP_MODE === "true",
    queuePollSeconds: "120",
    matchPollSeconds: "300"
  })

  log("INFO", `Scheduler initially ${schedulerEnabled ? "enabled" : "disabled"}`)
}

export { runJob }
