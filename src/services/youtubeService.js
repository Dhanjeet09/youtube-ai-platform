import fs from "fs"
import { youtube } from "../config/youtube.js"

export const uploadVideoToYouTube = async ({
  filePath,
  title,
  description,
  tags = [],
  privacyStatus = "public"
}) => {

  if (!fs.existsSync(filePath)) {
    throw new Error("Video file not found")
  }

  const response = await youtube.videos.insert({
    part: ["snippet", "status"],
    requestBody: {
      snippet: {
        title,
        description,
        tags,
        categoryId: "28" // Science & Tech
      },
      status: {
        privacyStatus
      }
    },
    media: {
      body: fs.createReadStream(filePath)
    }
  })

  return response.data
}