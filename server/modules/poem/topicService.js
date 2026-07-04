/**
 * Topic Selection Service
 *
 * Handles topic selection with deduplication via MongoDB TopicHistory.
 * Categories: motivation, nature, love, friendship, wisdom, spiritual
 *
 * Deduplication Strategy:
 *  1. Query TopicHistory for recently used topics (last 7 days).
 *  2. Select from unused topics first.
 *  3. If all topics used, reset and allow reuse (prioritising least-recently-used).
 */

import TopicHistory from "../../database/models/TopicHistory.js"
import { log as logger } from "../../utils/logger.js"

const log = (level, message, data = {}) => logger(level, `[TOPIC-SERVICE] ${message}`, data)

// ─── Topic Pool ────────────────────────────────────────────────────────
// Each topic is paired with its category for targeted selection.

const TOPIC_POOL = [
  // Motivation
  { text: "हौसला और जीत की कहानी", category: "motivation" },
  { text: "कभी हार मत मानो", category: "motivation" },
  { text: "सपनों की उड़ान", category: "motivation" },
  { text: "मेहनत का फल मीठा", category: "motivation" },
  { text: "ज़िंदगी बदलने वाला पल", category: "motivation" },
  { text: "हिम्मत से चलो ज़िंदगी", category: "motivation" },
  { text: "कामयाबी का रास्ता", category: "motivation" },
  { text: "असफलता से सफलता तक", category: "motivation" },

  // Nature
  { text: "बारिश की बूँदों का संगीत", category: "nature" },
  { text: "नदी का बहना और ज़िंदगी", category: "nature" },
  { text: "चाँदनी रात की ख़ामोशी", category: "nature" },
  { text: "सूरज की रोशनी में उम्मीद", category: "nature" },
  { text: "पहाड़ों की बुलंदी", category: "nature" },
  { text: "फूलों की महक", category: "nature" },
  { text: "तारों भरा आसमान", category: "nature" },

  // Love
  { text: "दिल से दिल का रिश्ता", category: "love" },
  { text: "माँ का प्यार", category: "love" },
  { text: "पिता की चुप मेहनत", category: "love" },
  { text: "यादों का सफ़र", category: "love" },
  { text: "प्यार का इंतज़ार", category: "love" },
  { text: "रिश्तों की डोर", category: "love" },
  { text: "दिल की बातें", category: "love" },

  // Friendship
  { text: "दोस्ती की कसम", category: "friendship" },
  { text: "सच्चे दोस्त की क़द्र", category: "friendship" },
  { text: "यारी की दास्तान", category: "friendship" },
  { text: "हँसी के पल", category: "friendship" },
  { text: "दोस्ती का एहसास", category: "friendship" },

  // Wisdom
  { text: "ज्ञान की रोशनी", category: "wisdom" },
  { text: "सच्चाई का रास्ता", category: "wisdom" },
  { text: "धैर्य का फल", category: "wisdom" },
  { text: "समय की क़ीमत", category: "wisdom" },
  { text: "अनुभव का पाठ", category: "wisdom" },
  { text: "क्षमा की शक्ति", category: "wisdom" },

  // Spiritual
  { text: "ईश्वर की दुआ", category: "spiritual" },
  { text: "कर्म का सिद्धांत", category: "spiritual" },
  { text: "शांति की खोज", category: "spiritual" },
  { text: "आत्मा की आवाज़", category: "spiritual" },
  { text: "भक्ति का रंग", category: "spiritual" },
  { text: "अंधेरे में दीया", category: "spiritual" },
]

const ALL_CATEGORIES = ["motivation", "nature", "love", "friendship", "wisdom", "spiritual"]

/**
 * Get topics that have NOT been used in the last `daysAgo` days.
 *
 * @param {number} daysAgo - Look-back window (default 7)
 * @returns {Promise<string[]>} - Array of unused topic strings
 */
const getUnusedTopics = async (daysAgo = 7) => {
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - daysAgo)

  const recentTopics = await TopicHistory.find({
    usedAt: { $gte: cutoff },
    success: true,
  })
    .select("topic -_id")
    .lean()

  const usedSet = new Set(recentTopics.map((t) => t.topic))
  return TOPIC_POOL.filter((t) => !usedSet.has(t.text))
}

/**
 * Get the least-recently-used topics (for reset / reuse scenario).
 *
 * @param {number} limit - Number of topics to return
 * @returns {Promise<Array<{text: string, category: string}>>}
 */
const getLeastRecentlyUsedTopics = async (limit = 5) => {
  const recentHistory = await TopicHistory.find({ success: true })
    .sort({ usedAt: 1 })
    .limit(50)
    .select("topic usedAt -_id")
    .lean()

  const lastUsedMap = new Map()
  for (const entry of recentHistory) {
    lastUsedMap.set(entry.topic, entry.usedAt)
  }

  const sorted = [...TOPIC_POOL].sort((a, b) => {
    const aTime = lastUsedMap.get(a.text)?.getTime() || 0
    const bTime = lastUsedMap.get(b.text)?.getTime() || 0
    return aTime - bTime
  })

  return sorted.slice(0, limit)
}

/**
 * Record a topic as used in TopicHistory.
 *
 * @param {string} topic - The topic text
 * @param {string} jobId  - Pipeline job ID
 * @param {string} category - Topic category
 * @param {boolean} success - Whether the pipeline succeeded
 */
export const recordTopicUsage = async (topic, jobId, category = "general", success = true) => {
  try {
    await TopicHistory.create({ topic, jobId, category, success })
    log("INFO", "Topic usage recorded", { topic, jobId, category, success })
  } catch (error) {
    log("WARN", "Failed to record topic usage", { error: error.message })
  }
}

/**
 * Select the next topic, avoiding duplicates.
 *
 * @param {object} [options]
 * @param {string} [options.preferredCategory] - Filter by category
 * @param {string} [options.forceTopic] - Skip selection, use this exact topic
 * @param {string} [options.jobId] - Current job ID for logging
 * @returns {Promise<{text: string, category: string}>}
 */
export const selectTopic = async (options = {}) => {
  const { preferredCategory = null, forceTopic = null, jobId = "unknown" } = options

  // ── Forced topic ─────────────────────────────────────────────────
  if (forceTopic) {
    const match = TOPIC_POOL.find((t) => t.text === forceTopic)
    const category = match?.category || "general"
    log("INFO", "Using forced topic", { topic: forceTopic, category, jobId })
    return { text: forceTopic, category }
  }

  // ── Try unused topics first ──────────────────────────────────────
  let candidates = await getUnusedTopics(7)

  // Filter by preferred category if specified
  if (preferredCategory && ALL_CATEGORIES.includes(preferredCategory)) {
    const categoryMatches = candidates.filter((t) => t.category === preferredCategory)
    if (categoryMatches.length > 0) {
      candidates = categoryMatches
    }
    // If no unused in preferred category, fall through to all unused
  }

  if (candidates.length > 0) {
    const selected = candidates[Math.floor(Math.random() * candidates.length)]
    log("INFO", "Selected unused topic", {
      topic: selected.text,
      category: selected.category,
      unusedCount: candidates.length,
      jobId,
    })
    return selected
  }

  // ── All topics used — reset and pick least-recently-used ─────────
  log("WARN", "All topics used in last 7 days, picking least-recently-used", { jobId })

  let resetCandidates = await getLeastRecentlyUsedTopics(10)

  if (preferredCategory && ALL_CATEGORIES.includes(preferredCategory)) {
    const categoryMatches = resetCandidates.filter((t) => t.category === preferredCategory)
    if (categoryMatches.length > 0) {
      resetCandidates = categoryMatches
    }
  }

  const selected = resetCandidates[Math.floor(Math.random() * resetCandidates.length)]

  log("INFO", "Selected recycled topic", {
    topic: selected.text,
    category: selected.category,
    jobId,
  })

  return selected
}

/**
 * Get topic stats for monitoring / dashboard.
 */
export const getTopicStats = async () => {
  const totalTopics = TOPIC_POOL.length
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

  const [usedCount, categoryCounts] = await Promise.all([
    TopicHistory.countDocuments({ usedAt: { $gte: sevenDaysAgo }, success: true }),
    TopicHistory.aggregate([
      { $match: { usedAt: { $gte: sevenDaysAgo }, success: true } },
      { $group: { _id: "$category", count: { $sum: 1 } } },
    ]),
  ])

  const categoryMap = Object.fromEntries(categoryCounts.map((c) => [c._id, c.count]))

  return {
    totalTopics,
    usedLast7Days: usedCount,
    remaining: Math.max(0, totalTopics - usedCount),
    byCategory: ALL_CATEGORIES.map((cat) => ({
      category: cat,
      total: TOPIC_POOL.filter((t) => t.category === cat).length,
      used: categoryMap[cat] || 0,
    })),
  }
}

/**
 * List all available categories.
 */
export const getCategories = () => ALL_CATEGORIES

/**
 * List all topics (for debugging / admin).
 */
export const getAllTopics = () => [...TOPIC_POOL]

export default {
  selectTopic,
  recordTopicUsage,
  getTopicStats,
  getCategories,
  getAllTopics,
}
