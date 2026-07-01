import { getGroqClient } from "../../config/groq.js"
import { log as logger } from "../../utils/logger.js"

const log = (level, message, data = {}) => logger(level, `[METADATA] ${message}`, data)

export const generateMetadata = async (script) => {

  try {

    const completion = await getGroqClient().chat.completions.create({
      model: process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
      messages: [
        {
          role: "user",
          content: `
Generate YouTube Shorts metadata.

Script:
${script}

STRICT FORMAT:
Title: <viral title under 60 chars>
Tags: tag1, tag2, tag3, tag4
`
        }
      ],
      temperature: 0.9
    })

    const text = completion.choices[0].message.content

    const titleMatch = text.match(/Title:\s*(.*)/i)
    const tagsMatch = text.match(/Tags:\s*(.*)/i)

    const title = titleMatch?.[1]?.trim() || "AI Tools You Must Try 🔥"

    const tags = tagsMatch?.[1]
      ?.split(",")
      .map(t => t.trim())
      .filter(Boolean) || ["AI", "Tech", "Shorts"]

    return { title, tags }

  } catch (error) {
    log("ERROR", "Metadata generation failed", { error: error.message })

    return {
      title: "AI Tools You Must Try 🔥",
      tags: ["AI", "Tech", "Shorts"]
    }
  }
}
