import axios from "axios"
import fs from "fs"
import path from "path"

const detectTone = (script) => {

  const text = script.toLowerCase()

  if (text.includes("ai") || text.includes("technology") || text.includes("tool"))
    return "en-us"

  if (text.includes("success") || text.includes("motivation") || text.includes("growth"))
    return "en-au"

  if (text.includes("news") || text.includes("update"))
    return "en-uk"

  return "en"
}

export const generateVoice = async (text) => {

  const audioDir = path.join("assets", "generated", "audio")

  if (!fs.existsSync(audioDir)) {
    fs.mkdirSync(audioDir, { recursive: true })
  }

  const tone = detectTone(text)

  const fileName = `voice-${Date.now()}-${Math.floor(Math.random()*1000)}.mp3`
  const outputPath = path.join(audioDir, fileName)

  const response = await axios({
    method: "GET",
    url: "https://translate.google.com/translate_tts",
    params: {
      ie: "UTF-8",
      client: "tw-ob",
      q: text,
      tl: tone
    },
    responseType: "arraybuffer"
  })

  fs.writeFileSync(outputPath, response.data)

  return outputPath
}