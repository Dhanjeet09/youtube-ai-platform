import axios from "axios"
import fs from "fs"
import path from "path"
import crypto from "crypto"
import { log as logger } from "../../utils/logger.js"
import { isR2Configured } from "../../config/r2.js"
import { uploadFile, getBucketPath } from "../../services/r2Service.js"

const log = (level, message, data = {}) => logger(level, `[VOICE] ${message}`, data)

// ─── Edge TTS voice mapping ──────────────────────────────────────
const EDGE_TTS_VOICES = {
  "en-US": "en-US-GuyNeural",
  "en-GB": "en-GB-RyanNeural",
  "en-AU": "en-AU-WilliamNeural",
  "en-IN": "en-IN-PrabhatNeural",
  "hi-IN": "hi-IN-SwaraNeural"
}

// Google TTS language code mapping (uses locale codes)
const GOOGLE_TTS_LOCALE = {
  "en-US": "en-US",
  "en-GB": "en-GB",
  "en-AU": "en-AU",
  "en-IN": "en-IN",
  "hi-IN": "hi-IN"
}

const detectVoice = (script, options = {}) => {
  const { language = "english" } = options

  if (language === "hinglish") {
    return "hi-IN"
  }

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

// ─── Edge TTS Provider ─────────────────────────────────────────────
const edgeTtsProvider = async (fullText, tone) => {
  const { EdgeTTSClient, OUTPUT_FORMAT } = await import("edge-tts-client")

  const voiceName = EDGE_TTS_VOICES[tone] || "en-US-GuyNeural"
  const fileName = `voice-edge-${Date.now()}-${crypto.randomUUID().slice(0, 8)}.mp3`
  const tempOutput = path.join("assets/generated/audio", fileName)

  const client = new EdgeTTSClient()
  let clientClosed = false

  const safeClose = async () => {
    if (!clientClosed) {
      clientClosed = true
      try {
        await client.close()
      } catch { /* ignore close errors */ }
    }
  }

  try {
    await client.setMetadata(voiceName, OUTPUT_FORMAT.AUDIO_24KHZ_96KBITRATE_MONO_MP3)
    const stream = client.toStream(fullText)

    const audioChunks = []
    for await (const chunk of stream) {
      audioChunks.push(chunk)
    }

    if (audioChunks.length === 0) {
      throw new Error("No audio data received from Edge TTS")
    }

    const audioBuffer = Buffer.concat(audioChunks)
    fs.writeFileSync(tempOutput, audioBuffer)
    await safeClose()

    // 🔴 FIX: Log only basename, not full path
    log("INFO", "Edge TTS: audio file written", { filename: path.basename(tempOutput), size: `${(audioBuffer.length / 1024).toFixed(2)}KB` })

    // Read the file back as chunks for consistency with the concat pattern
    const fileBuffer = fs.readFileSync(tempOutput)
    fs.unlinkSync(tempOutput) // Clean up temp file

    return [fileBuffer]
  } catch (err) {
    await safeClose()
    // Clean up temp file if it was already written
    try {
      if (fs.existsSync(tempOutput)) fs.unlinkSync(tempOutput)
    } catch { /* best-effort */ }
    throw new Error(`Edge TTS failed: ${err.message}`)
  }
}

const googleTtsProvider = async (chunks, tone) => {
  const pcmChunks = []

  for (let i = 0; i < chunks.length; i++) {
    const response = await axios({
      method: "GET",
      url: "https://translate.google.com/translate_tts",
      params: {
        ie: "UTF-8",
        client: "tw-ob",
        q: chunks[i],
        tl: GOOGLE_TTS_LOCALE[tone] || tone
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
    throw new Error("No audio data generated from Google TTS")
  }

  return pcmChunks
}

/* Future provider support (ElevenLabs / Azure):
   const elevenLabsProvider = async (chunks, tone) => { ... }
   const azureProvider = async (chunks, tone) => { ... }
*/

export const generateVoice = async (text, options = {}) => {
  const { voice: forcedVoice, outputDir = "assets/generated/audio", provider = "edge", language = "english" } = options

  if (!text || text.trim().length === 0) {
    throw new Error("Text is required for voice generation")
  }

  const audioDir = outputDir
  if (!fs.existsSync(audioDir)) {
    fs.mkdirSync(audioDir, { recursive: true })
  }

  const tone = forcedVoice || detectVoice(text, { language })
  const chunks = splitIntoChunks(text)

  const fileName = `voice-${Date.now()}-${crypto.randomUUID().slice(0, 8)}.mp3`
  const outputPath = path.join(audioDir, fileName)

  try {
    log("INFO", "Generating voice", { tone, textLength: text.length, chunks: chunks.length, provider, language })

    let audioChunks

    if (provider === "edge") {
      // Primary: Edge TTS — works with the full text (no chunking needed)
      try {
        log("INFO", "Using Edge TTS provider")
        audioChunks = await edgeTtsProvider(text, tone)
        log("INFO", "Edge TTS succeeded")
      } catch (edgeError) {
        log("WARN", "Edge TTS failed, falling back to Google TTS", { error: edgeError.message })
        audioChunks = await googleTtsProvider(chunks, tone)
      }
    } else {
      // Fallback / explicit Google TTS
      log("INFO", "Using Google TTS provider")
      audioChunks = await googleTtsProvider(chunks, tone)
    }

    const combined = Buffer.concat(audioChunks)
    fs.writeFileSync(outputPath, combined)

    const fileSize = (fs.statSync(outputPath).size / 1024).toFixed(2)
    const fileName = path.basename(outputPath)
    // 🔴 FIX: Log only basename, not full path
    log("INFO", "Voice generated", { filename: fileName, size: `${fileSize}KB`, provider })

    // Upload to R2 if configured (as side effect — pipeline still needs local file)
    if (isR2Configured()) {
      try {
        const r2Key = getBucketPath("audio", fileName)
        const result = await uploadFile(r2Key, outputPath, "audio/mpeg")
        if (result) {
          log("INFO", "Voice uploaded to R2", { key: result.key, local: outputPath })
        }
      } catch (r2Error) {
        log("WARN", "Failed to upload voice to R2", { error: r2Error.message })
      }
    }

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
