import groq from "../config/groq.js"

const TITLE_TEMPLATES = [
  "I Tried {x} for 30 Days - Here's What Happened",
  "{topic}: What Nobody Tells You",
  "The Ultimate {topic} Guide for 2026",
  "Why {topic} Changed Everything for Me",
  "How to Master {topic} in 30 Days",
  "{topic} Explained in 5 Minutes",
  "I Made $5000 Using {topic} - Full Breakdown",
  "Stop Wasting Time on {topic} - Do This Instead"
]

const HOOK_TEMPLATES = [
  "What if I told you that {topic} could change your life?",
  "95% of people get this wrong about {topic}",
  "Here's the #1 secret about {topic} nobody talks about",
  "This {topic} strategy completely changed my game",
  "I spent 3 years learning {topic} - here's what matters",
  "The truth about {topic} that experts won't share"
]

export const generateSEOContent = async (topic, niche) => {
  try {
    const title = generateRandomTitle(topic)
    const hook = generateRandomHook(topic)

    const completion = await groq.chat.completions.create({
      model: process.env.GROQ_MODEL,
      messages: [{
        role: "user",
        content: `
Generate SEO-optimized content for a YouTube video.

Topic: ${topic}
Niche: ${niche}

Generate:
1. 5 SEO-optimized titles (under 60 chars each, with numbers and emotional words)
2. 10 high-volume keywords/tags
3. A keyword-rich description (300+ words with natural keyword placement)
4. A compelling video hook for the first 5 seconds

Format as JSON with keys: titles[], keywords[], description, hook
`
      }],
      temperature: 0.8
    })

    const content = completion?.choices?.[0]?.message?.content
    if (!content) throw new Error("Empty response")

    try {
      const parsed = JSON.parse(content)
      return {
        ...parsed,
        originalTitle: title,
        hook
      }
    } catch {
      return {
        titles: [title],
        keywords: [topic, niche, "2026", "tips", "guide"],
        description: `Learn everything about ${topic} in this video. ${topic} tips and strategies for success.`,
        hook,
        originalTitle: title
      }
    }
  } catch (error) {
    console.error("SEO generation failed:", error.message)
    return {
      titles: [topic],
      keywords: [topic, niche],
      description: topic,
      hook: `Here's everything about ${topic} you need to know!`
    }
  }
}

const generateRandomTitle = (topic) => {
  const template = TITLE_TEMPLATES[Math.floor(Math.random() * TITLE_TEMPLATES.length)]
  const x = topic.split(" ").slice(0, 2).join(" ")
  return template.replace("{x}", x).replace("{topic}", topic)
}

const generateRandomHook = (topic) => {
  const template = HOOK_TEMPLATES[Math.floor(Math.random() * HOOK_TEMPLATES.length)]
  return template.replace("{topic}", topic.split(" ")[0])
}

export const getTrendingKeywords = async (niche) => {
  try {
    const completion = await groq.chat.completions.create({
      model: process.env.GROQ_MODEL,
      messages: [{
        role: "user",
        content: `List 20 high-volume YouTube search keywords for "${niche}" niche in 2026. Format as JSON array of strings.`
      }],
      temperature: 0.5
    })

    const content = completion?.choices?.[0]?.message?.content
    if (!content) return []

    try {
      return JSON.parse(content)
    } catch {
      return content.split("\n").filter(Boolean).slice(0, 20)
    }
  } catch {
    return []
  }
}
