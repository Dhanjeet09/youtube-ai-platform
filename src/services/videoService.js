import axios from "axios"
import fs from "fs"
import path from "path"

export const downloadStockVideo = async (query) => {

  const response = await axios.get(
    "https://api.pexels.com/videos/search",
    {
      headers: {
        Authorization: process.env.PEXELS_API_KEY,
      },
      params: {
        query,
        per_page: 10,
      },
    }
  )

  const videos = response.data.videos

  if (!videos || !Array.isArray(videos) || videos.length === 0) {
    throw new Error(`No videos found for query: ${query}`)
  }

  // random video selection
  const randomVideo = videos[Math.floor(Math.random() * videos.length)]

  if (!randomVideo.video_files || randomVideo.video_files.length === 0) {
    throw new Error(`No video files found for query: ${query}`)
  }

  const videoUrl = randomVideo.video_files[0].link

  const videoDir = "assets/generated/videos"

  if (!fs.existsSync(videoDir)) {
    fs.mkdirSync(videoDir, { recursive: true })
  }

  const filename = `stock_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.mp4`
  const outputPath = path.join(videoDir, filename)
  const videoStream = await axios({
    url: videoUrl,
    method: "GET",
    responseType: "stream"
  })

  const writer = fs.createWriteStream(outputPath)

  videoStream.data.pipe(writer)

  return new Promise((resolve, reject) => {
    writer.on("finish", () => resolve(outputPath))
    writer.on("error", reject)
    videoStream.data.on("error", reject)
  })}