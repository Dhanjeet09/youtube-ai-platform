import axios from "axios"
import fs from "fs"
import path from "path"

export const downloadStockVideo = async (query) => {

  const response = await axios.get(
    `https://api.pexels.com/videos/search?query=${query}&per_page=1`,
    {
      headers: {
        Authorization: process.env.PEXELS_API_KEY
      }
    }
  )

  const videoUrl =
    response.data.videos[0].video_files[0].link

  const videoDir = "assets/generated/videos"

  if (!fs.existsSync(videoDir)) {
    fs.mkdirSync(videoDir, { recursive: true })
  }

  const outputPath = path.join(videoDir, "stock.mp4")

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
  })
}