import fs from "fs"
import path from "path"
import { youtube, ensureYouTubeAuth } from "../../config/youtube.js"
import { log as logger } from "../../utils/logger.js"

const log = (level, message, data = {}) => logger(level, `[UPLOAD] ${message}`, data)

export const uploadVideoToYouTube = async ({
  filePath,
  title,
  description,
  tags = [],
  privacyStatus = "public",
  categoryId
}) => {

  try {
    // 🔴 FIX: Ensure YouTube OAuth tokens are loaded before attempting upload.
    // Without this, the first upload after server start would fail because
    // the lazy token loading might not have completed yet.
    await ensureYouTubeAuth()

    if (!filePath) {
      throw new Error("filePath is missing")
    }

    const absolutePath = path.resolve(filePath)

    log("INFO", "Uploading file", { path: absolutePath })

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
          categoryId: categoryId || "28"
        },
        status: {
          privacyStatus
        }
      },
      media: {
        body: fs.createReadStream(absolutePath)
      }
    })

    log("INFO", "YouTube Upload Success", { id: response.data.id })

    return response.data

  } catch (error) {

    log("ERROR", "YouTube Upload Error", { error: error.message })

    throw error
  }
}
