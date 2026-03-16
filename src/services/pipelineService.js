import { getTrends } from "./trendService.js"
import { generateScript } from "./scriptService.js"
import { generateVoice } from "./voiceService.js"
import { downloadStockVideo } from "./videoService.js"
import { renderVideo } from "./renderService.js"

export const createVideoPipeline = async () => {

  // 1️⃣ Get trend topic
  const trends = await getTrends()

  if (!trends.length) {
    throw new Error("No trends available")
  }

  const topic = trends[0]

  // 2️⃣ Generate script
  const script = await generateScript(topic)

  // 3️⃣ Generate voice
  const audioPath = await generateVoice(script)

  // 4️⃣ Download stock video
  const videoPath = await downloadStockVideo(topic)

  // 5️⃣ Render final video
  const finalVideo = await renderVideo(audioPath, videoPath)

  return {
    topic,
    script,
    audio: audioPath,
    stockVideo: videoPath,
    finalVideo
  }

}