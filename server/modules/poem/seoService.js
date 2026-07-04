/**
 * SEO Generation Service
 *
 * Generates YouTube-optimised title, description, tags, and hashtags
 * for Hindi poem Shorts. Uses a combination of template logic and
 * keyword analysis to produce SEO-friendly metadata.
 */

import { log as logger } from "../../utils/logger.js"

const log = (level, message, data = {}) => logger(level, `[SEO-SERVICE] ${message}`, data)

// ─── Constants ──────────────────────────────────────────────────────────

const HINDI_HASHTAGS = [
  "HindiShayari", "HindiPoem", "Shayari", "Poetry",
  "HindiPoetry", "ShayariVideo", "PoemVideo",
  "MotivationalShayari", "LoveShayari", "LifeQuotes",
  "HindiQuotes", "InspirationalPoetry", "DeepShayari",
  "SadShayari", "FriendshipShayari", "SpiritualPoetry",
]

const CATEGORY_HASHTAGS = {
  motivation: ["Motivation", "Inspiration", "SuccessMindset", "NeverGiveUp", "KeepGoing"],
  nature: ["Nature", "BeautifulNature", "RainPoetry", "MoonPoetry", "SunsetVibes"],
  love: ["Love", "LovePoetry", "RomanticShayari", "TrueLove", "DilSe"],
  friendship: ["Friendship", "Dosti", "TrueFriend", "FriendshipGoals", "Yaari"],
  wisdom: ["Wisdom", "LifeLessons", "Knowledge", "DeepThoughts", "Philosophy"],
  spiritual: ["Spiritual", "Bhakti", "InnerPeace", "Meditation", "Divine"],
}

const TITLE_TEMPLATES = [
  "{title} | Hindi Shayari | #Shorts",
  "{title} | Emotional Hindi Poem | #shorts",
  "{title} | Hindi Poetry | शायरी | #Shorts",
  "{title} | Heart Touching Shayari | #shorts",
  "{title} | Best Hindi Shayari | #Shorts",
]

const DESCRIPTION_FOOTER = `
=================================
हिंदी शायरी और कविता | Hindi Shayari & Poetry
=================================

अगर ये शायरी आपके दिल को छू गई तो LIKE 👍 करें और SUBSCRIBE करें! 🔔

हर रोज़ नई शायरी और कविता सिर्फ इस चैनल पर।

#HindiShayari #HindiPoem #Shayari #Poetry #Shorts
#HindiPoetry #MotivationalShayari #LoveShayari
#LifeQuotes #InspirationalPoetry #DeepShayari
`

// ─── Helper Functions ───────────────────────────────────────────────────

/**
 * Extract the first meaningful phrase from poem lines for the title.
 *
 * @param {string[]} lines - Poem lines
 * @param {number} [maxLen=40] - Max characters for title segment
 * @returns {string}
 */
const extractTitleFromLines = (lines, maxLen = 40) => {
  if (!lines || lines.length === 0) return "Hindi Shayari"

  // Take first line, clean it up
  const firstLine = lines[0]
    .replace(/[।,!?;:'"()\-]/g, "")
    .trim()

  if (firstLine.length <= maxLen) return firstLine
  return firstLine.substring(0, maxLen - 3).trim() + "..."
}

/**
 * Clean and sanitise text for YouTube SEO.
 *
 * @param {string} text
 * @returns {string}
 */
const sanitiseText = (text) => {
  return text
    .replace(/[*#_~`]/g, "")
    .replace(/\s+/g, " ")
    .trim()
}

// ─── Main Export ────────────────────────────────────────────────────────

/**
 * Generate complete SEO metadata for a Hindi poem Short.
 *
 * @param {object} params
 * @param {string} params.poemTitle - AI-generated poem title
 * @param {string[]} params.poemLines - Poem lines array
 * @param {string} params.topic - Selected topic text
 * @param {string} params.category - Topic category
 * @param {number} [params.sceneCount] - Number of scenes (for description context)
 * @returns {{title: string, description: string, tags: string[], hashtags: string[]}}
 */
export const generatePoemSEO = (params) => {
  const {
    poemTitle = "",
    poemLines = [],
    topic = "",
    category = "motivation",
    sceneCount = 3,
  } = params

  // ── Title ────────────────────────────────────────────────────────
  const baseTitle = sanitiseText(poemTitle) || extractTitleFromLines(poemLines)
  const template = TITLE_TEMPLATES[Math.floor(Math.random() * TITLE_TEMPLATES.length)]
  const title = template.replace("{title}", baseTitle)

  // ── Tags ─────────────────────────────────────────────────────────
  const categoryTags = CATEGORY_HASHTAGS[category] || CATEGORY_HASHTAGS.motivation
  const tags = [
    "Hindi Shayari",
    "Hindi Poem",
    "Shayari",
    "Poetry",
    "Hindi Poetry",
    "Shorts",
    ...categoryTags.slice(0, 3),
  ]

  // ── Hashtags ─────────────────────────────────────────────────────
  const baseHashtags = HINDI_HASHTAGS.slice(0, 6)
  const catHashtags = categoryTags.slice(0, 3).map((h) => h.replace(/\s+/g, ""))
  const hashtags = [...new Set([...baseHashtags, ...catHashtags])]

  // ── Description ──────────────────────────────────────────────────
  const poemPreview = poemLines.slice(0, 4).join("\n")
  const description = [
    `${sanitiseText(baseTitle)}`,
    "",
    poemPreview,
    "",
    "---",
    "",
    `Topic: ${topic}`,
    `Category: ${category}`,
    "",
    DESCRIPTION_FOOTER,
  ].join("\n")

  log("INFO", "SEO metadata generated", {
    title: title.substring(0, 60),
    tagCount: tags.length,
    hashtagCount: hashtags.length,
    category,
  })

  return {
    title,
    description,
    tags,
    hashtags,
  }
}

/**
 * Generate a YouTube-ready upload payload from poem SEO data.
 *
 * @param {object} seoResult - Output of generatePoemSEO()
 * @returns {{title: string, description: string, tags: string[], categoryId: string, privacyStatus: string}}
 */
export const buildYouTubePayload = (seoResult) => {
  const { title, description, tags } = seoResult

  return {
    title,
    description,
    tags,
    categoryId: "24", // Entertainment
    privacyStatus: "public",
  }
}

/**
 * Generate SEO data from an existing poem object (for pre-existing poems).
 *
 * @param {object} poem - Poem object from poems.js database
 * @returns {object} - SEO metadata
 */
export const generateSEOForExistingPoem = (poem) => {
  if (!poem) throw new Error("Poem object is required")

  const lines = typeof poem.lines === "string"
    ? poem.lines.split("\n").filter((l) => l.trim())
    : poem.lines

  const category = poem.tags?.[0] || "motivation"

  return generatePoemSEO({
    poemTitle: poem.title,
    poemLines: lines,
    topic: poem.title,
    category,
  })
}

export default {
  generatePoemSEO,
  buildYouTubePayload,
  generateSEOForExistingPoem,
}
