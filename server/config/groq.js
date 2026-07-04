import Groq from "groq-sdk"

let groq = null

export const getGroqClient = () => {
  if (!groq) {
    if (!process.env.GROQ_API_KEY) {
      throw new Error("GROQ_API_KEY environment variable is required")
    }
    groq = new Groq({
      apiKey: process.env.GROQ_API_KEY
    })
  }
  return groq
}

export default groq
