import express from "express"
import { MatchEvent, ContentQueue, ContentTemplate } from "./models/index.js"
import { asyncHandler } from "../middleware/asyncHandler.js"
import { log as logger } from "../utils/logger.js"

const router = express.Router()

const log = (level, message, data = {}) => logger(level, `[DATABASE] ${message}`, data)

// ─── Match Event Routes ─────────────────────────────────────────────

router.get("/matches", asyncHandler(async (req, res) => {
  // 🔴 FIX: Prevent NoSQL injection by ensuring query params are strings, not objects.
  // If an attacker passes ?status[$ne]=finished, Express parses status as an object
  // { $ne: 'finished' }, which would inject a MongoDB operator.
  const { status, stage } = req.query
  const filter = {}
  if (status && typeof status === "string") filter.status = status
  if (stage && typeof stage === "string") filter.stage = stage

  const matches = await MatchEvent.find(filter)
    .sort({ kickoffTime: -1 })
    .limit(100)
    .lean()

  res.json({ success: true, data: matches })
}))

router.get("/matches/:id", asyncHandler(async (req, res) => {
  const match = await MatchEvent.findOne({ matchId: req.params.id }).lean()
  if (!match) {
    return res.status(404).json({ success: false, message: "Match not found" })
  }
  res.json({ success: true, data: match })
}))

router.post("/matches", asyncHandler(async (req, res) => {
  const { matchId, team1, team2, score1, score2, status, kickoffTime, finishedTime, stage, goals } = req.body

  if (!matchId || typeof matchId !== "string" || !matchId.trim()) {
    return res.status(400).json({ success: false, message: "matchId is required and must be a non-empty string" })
  }
  if (!team1 || typeof team1 !== "string" || !team1.trim()) {
    return res.status(400).json({ success: false, message: "team1 is required and must be a non-empty string" })
  }
  if (!team2 || typeof team2 !== "string" || !team2.trim()) {
    return res.status(400).json({ success: false, message: "team2 is required and must be a non-empty string" })
  }

  if (matchId.trim().length > 100 || team1.trim().length > 100 || team2.trim().length > 100) {
    return res.status(400).json({ success: false, message: "matchId, team1, team2 must not exceed 100 characters each" })
  }

  if (score1 !== undefined && (typeof score1 !== "number" || score1 < 0 || !Number.isInteger(score1))) {
    return res.status(400).json({ success: false, message: "score1 must be a non-negative integer" })
  }
  if (score2 !== undefined && (typeof score2 !== "number" || score2 < 0 || !Number.isInteger(score2))) {
    return res.status(400).json({ success: false, message: "score2 must be a non-negative integer" })
  }

  const match = await MatchEvent.findOneAndUpdate(
    { matchId: matchId.trim() },
    {
      matchId: matchId.trim(),
      team1: team1.trim(),
      team2: team2.trim(),
      score1: score1 || 0,
      score2: score2 || 0,
      status: status || "scheduled",
      kickoffTime,
      finishedTime,
      stage,
      goals: goals || []
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  )

  log("INFO", "Match created/updated", { matchId: matchId.trim(), team1: team1.trim(), team2: team2.trim(), status })

  res.json({ success: true, data: match })
}))

router.post("/matches/event", asyncHandler(async (req, res) => {
  const { matchId, event, data } = req.body

  if (!matchId || typeof matchId !== "string" || !matchId.trim()) {
    return res.status(400).json({ success: false, message: "matchId is required and must be a non-empty string" })
  }
  if (!event || typeof event !== "string" || !event.trim()) {
    return res.status(400).json({ success: false, message: "event is required and must be a non-empty string" })
  }

  if (matchId.trim().length > 100 || event.trim().length > 50) {
    return res.status(400).json({ success: false, message: "matchId or event exceeds maximum length" })
  }

  log("INFO", "Match event received", { matchId: matchId.trim(), event: event.trim() })

  if (event === "match-end" && data) {
    const match = await MatchEvent.findOneAndUpdate(
      { matchId },
      {
        score1: data.score1,
        score2: data.score2,
        status: "finished",
        finishedTime: new Date(),
        goals: data.goals || [],
        stats: data.stats || {}
      },
      { new: true }
    )

    if (match) {
      const queueEntry = await ContentQueue.create({
        jobId: `match-${matchId}-${Date.now()}`,
        type: "short",
        match: match._id,
        vars: {
          team1: match.team1,
          team2: match.team2,
          score1: match.score1,
          score2: match.score2,
          goals: match.goals
        },
        status: "queued",
        priority: 5
      })

      log("INFO", "Content queued from match-end event", { jobId: queueEntry.jobId })

      return res.json({
        success: true,
        message: "Match ended, content queued",
        data: { match, queueJob: queueEntry }
      })
    }

    return res.json({ success: true, message: "Match event processed, but no match found" })
  }

  res.json({ success: true, message: `Event ${event} received for match ${matchId}` })
}))

// ─── Content Template Routes ────────────────────────────────────────

router.get("/templates", asyncHandler(async (req, res) => {
  // 🔴 FIX: Prevent NoSQL injection - ensure query params are strings
  const { type, category } = req.query
  const filter = {}
  if (type && typeof type === "string") filter.type = type
  if (category && typeof category === "string") filter.category = category

  const templates = await ContentTemplate.find(filter)
    .sort({ name: 1 })
    .limit(200)
    .lean()

  res.json({ success: true, data: templates })
}))

router.get("/templates/:id", asyncHandler(async (req, res) => {
  const template = await ContentTemplate.findById(req.params.id).lean()
  if (!template) {
    return res.status(404).json({ success: false, message: "Template not found" })
  }
  res.json({ success: true, data: template })
}))

router.post("/templates", asyncHandler(async (req, res) => {
  const { name, type, category, orientation, maxWords, promptTemplate, requiredVars, defaultTags, rpm } = req.body

  if (!name || !type || !category) {
    return res.status(400).json({ success: false, message: "name, type, category are required" })
  }

  const existing = await ContentTemplate.findOne({ name }).lean()
  if (existing) {
    return res.status(409).json({ success: false, message: `Template '${name}' already exists` })
  }

  const template = await ContentTemplate.create({
    name, type, category, orientation, maxWords, promptTemplate,
    requiredVars: requiredVars || [],
    defaultTags: defaultTags || [],
    rpm: rpm || 5
  })

  log("INFO", "Template created", { name, type, category })

  res.status(201).json({ success: true, data: template })
}))

export default router
