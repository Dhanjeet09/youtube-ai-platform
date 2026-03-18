import groq from "../config/groq.js"

export const generateScript = async (topic) => {

  const styles = [
    "storytelling",
    "shocking facts",
    "list style",
    "educational",
    "motivational",
    "curiosity driven"
  ]

  const hooks = [
    "start with a shocking fact",
    "start with a question",
    "start with a bold statement",
    "start with a surprising statistic"
  ]

  const style = styles[Math.floor(Math.random() * styles.length)]
  const hook = hooks[Math.floor(Math.random() * hooks.length)]

  try {

    const completion = await groq.chat.completions.create({
      model: process.env.GROQ_MODEL,
      messages: [
        {
          role: "user",
          content: `
Write a viral YouTube Shorts script.

Topic: ${topic}

Style: ${style}
Hook type: ${hook}

Structure:
Hook (first 3 seconds)
3 fast points
Call to action

Requirements:
- energetic tone
- short sentences
- optimized for voice narration
- max 100 words
`
        }
      ],
      temperature: 0.9
    })

    const script = completion?.choices?.[0]?.message?.content

    if (!script) {
      throw new Error("Empty script generated")
    }

    return script.trim()

  } catch (error) {

    console.error("Groq Error:", error?.message || error)

    throw new Error("AI script generation failed")

  }

}