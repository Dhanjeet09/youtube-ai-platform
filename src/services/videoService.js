import axios from "axios"
import fs from "fs"
import path from "path"

export const downloadStockVideo = async (query) => {

  const response = await axios.get(
    `https://api.pexels.com/videos/search?query=${encodeURIComponent(query)}&per_page=1`,
    {
      headers: {
        Authorization: process.env.PEXELS_API_KEY
      },
      timeout: 10000
    }
  )

  if (!response.data.videos || !Array.isArray(response.data.videos) || response.data.videos.length === 0) {
    throw new Error(`No videos found for query: ${query}`);
  }

  const video = response.data.videos[0];
  if (!video.video_files || !Array.isArray(video.video_files) || video.video_files.length === 0) {
    throw new Error(`No video files found for query: ${query}`);
  }

  const videoUrl = video.video_files[0].link

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