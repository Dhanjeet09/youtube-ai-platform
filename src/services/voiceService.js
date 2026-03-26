import axios from "axios"
import fs from "fs"
import path from "path"

const log = (level, message, data = {}) => {
  console.log(`[${level}] [VOICE] ${message}`, Object.keys(data).length ? JSON.stringify(data) : "")
}

const detectVoice = (script) => {
  const text = script.toLowerCase()

  if (text.includes("ai") || text.includes("technology") || text.includes("tool") || text.includes("software")) {
    return "en-US"
  }
  if (text.includes("success") || text.includes("motivation") || text.includes("growth")) {
    return "en-AU"
  }
  if (text.includes("news") || text.includes("update") || text.includes("breaking")) {
    return "en-GB"
  }
  if (text.includes("finance") || text.includes("money") || text.includes("investment")) {
    return "en-IN"
  }

  return "en-US"
}

const MAX_CHUNK_LENGTH = 200

const splitIntoChunks = (text, maxLength = MAX_CHUNK_LENGTH) => {
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text]
  const chunks = []
  let currentChunk = ""

  for (const sentence of sentences) {
    if (currentChunk.length + sentence.length > maxLength && currentChunk) {
      chunks.push(currentChunk.trim())
      currentChunk = ""
    }
    currentChunk += sentence
  }

  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim())
  }

  return chunks.length > 0 ? chunks : [text.substring(0, maxLength)]
}

export const generateVoice = async (text, options = {}) => {
  const { voice: forcedVoice, outputDir = "assets/generated/audio" } = options

  if (!text || text.trim().length === 0) {
    throw new Error("Text is required for voice generation")
  }

  const audioDir = outputDir
  if (!fs.existsSync(audioDir)) {
    fs.mkdirSync(audioDir, { recursive: true })
  }

  const tone = forcedVoice || detectVoice(text)
  const chunks = splitIntoChunks(text)

  const fileName = `voice-${Date.now()}-${Math.floor(Math.random() * 1000)}.mp3`
  const outputPath = path.join(audioDir, fileName)

  try {
    log("INFO", "Generating voice", { tone, textLength: text.length, chunks: chunks.length })

    if (chunks.length === 1) {
      const response = await axios({
        method: "GET",
        url: "https://translate.google.com/translate_tts",
        params: {
          ie: "UTF-8",
          client: "tw-ob",
          q: chunks[0],
          tl: tone
        },
        responseType: "arraybuffer",
        timeout: 30000,
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        }
      })

      if (!response.data || response.data.length === 0) {
        throw new Error("TTS returned empty audio data")
      }

      fs.writeFileSync(outputPath, response.data)
    } else {
      const pcmChunks = []

      for (let i = 0; i < chunks.length; i++) {
        log("INFO", `Generating chunk ${i + 1}/${chunks.length}`)

        const response = await axios({
          method: "GET",
          url: "https://translate.google.com/translate_tts",
          params: {
            ie: "UTF-8",
            client: "tw-ob",
            q: chunks[i],
            tl: tone
          },
          responseType: "arraybuffer",
          timeout: 30000,
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
          }
        })

        if (response.data && response.data.length > 0) {
          pcmChunks.push(Buffer.from(response.data))
        }
      }

      if (pcmChunks.length === 0) {
        throw new Error("No audio data generated")
      }

      const combined = Buffer.concat(pcmChunks)
      fs.writeFileSync(outputPath, combined)
    }

    const fileSize = (fs.statSync(outputPath).size / 1024).toFixed(2)
    log("INFO", "Voice generated", { outputPath, size: `${fileSize}KB` })

    return outputPath

  } catch (error) {
    log("ERROR", "Voice generation failed", { error: error.message, tone })
    throw new Error(`Voice generation failed: ${error.message}`)
  }
}

export const generateVoiceBatch = async (texts) => {
  const results = await Promise.allSettled(
    texts.map(text => generateVoice(text))
  )

  return results.map((r, i) => ({
    index: i,
    success: r.status === "fulfilled",
    path: r.status === "fulfilled" ? r.value : null,
    error: r.reason?.message || null
  }))
}
