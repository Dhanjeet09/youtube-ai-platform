import fs from "fs"
import path from "path"
import { youtube } from "../config/youtube.js"

export const uploadVideoToYouTube = async ({
  filePath,
  title,
  description,
  tags = [],
  privacyStatus = "public"
}) => {

  try {

    if (!filePath) {
      throw new Error("filePath is missing")
    }

    const absolutePath = path.resolve(filePath)

    console.log("📁 Uploading file:", absolutePath)

    if (!fs.existsSync(absolutePath)) {
      throw new Error(`Video file not found at: ${absolutePath}`)
    }

    const response = await youtube.videos.insert({
      part: ["snippet", "status"],
      requestBody: {
        snippet: {
          title: title || "AutoTube Video 🔥",
          description: description || title,
          tags: Array.isArray(tags) ? tags : [],
          categoryId: "28"
        },
        status: {
          privacyStatus
        }
      },
      media: {
        body: fs.createReadStream(absolutePath)
      }
    })

    console.log("✅ YouTube Upload Success:", response.data.id)

    return response.data

  } catch (error) {

    console.error("❌ YouTube Upload Error:", error.message)

    throw error
  }
}