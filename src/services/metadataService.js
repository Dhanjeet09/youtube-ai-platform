import groq from "../config/groq.js"

export const generateMetadata = async (script) => {

  try {

    const completion = await groq.chat.completions.create({
      model: process.env.GROQ_MODEL,
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

    console.log("RAW METADATA:", text)

    const titleMatch = text.match(/Title:\s*(.*)/i)
    const tagsMatch = text.match(/Tags:\s*(.*)/i)

    const title = titleMatch?.[1]?.trim() || "AI Tools You Must Try 🔥"

    const tags = tagsMatch?.[1]
      ?.split(",")
      .map(t => t.trim())
      .filter(Boolean) || ["AI", "Tech", "Shorts"]

    return { title, tags }

  } catch (error) {
    console.error("Metadata error:", error.message)

    return {
      title: "AI Tools You Must Try 🔥",
      tags: ["AI", "Tech", "Shorts"]
    }
  }
}