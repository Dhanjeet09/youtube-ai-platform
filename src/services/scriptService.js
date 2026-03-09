import groq from "../config/groq.js"

export const generateScript = async (topic) => {

  try {

    const completion = await groq.chat.completions.create({
      model: process.env.GROQ_MODEL,
      messages: [
        {
          role: "user",
          content: `
Write a viral YouTube Shorts script.

Topic: ${topic}

Structure:
Hook (3 seconds)
3 quick points
Call to action

Max 100 words.
`
        }
      ]
    })

    return completion.choices[0].message.content

  } catch (error) {

    console.error("Groq Error:", error)

    throw new Error("AI script generation failed")

  }

}