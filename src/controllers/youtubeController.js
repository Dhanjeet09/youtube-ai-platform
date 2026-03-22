import { oauth2Client } from "../config/youtube.js"
import { uploadVideoToYouTube } from "../services/youtubeService.js"
import fs from "fs"

export const youtubeAuth = (req, res) => {

  const url = oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: ["https://www.googleapis.com/auth/youtube.upload"],
    prompt: "consent" // ensures refresh_token
  })

  res.redirect(url)
}

export const youtubeCallback = async (req, res) => {

  try {
    const { code } = req.query

    if (!code) {
      return res.status(400).send("No code provided")
    }

    const { tokens } = await oauth2Client.getToken(code)

    oauth2Client.setCredentials(tokens)

    fs.writeFileSync("youtube-token.json", JSON.stringify(tokens, null, 2))

    res.send("✅ YouTube Auth Successful! You can close this tab.")

  } catch (error) {
    console.error(error)
    res.status(500).send("Auth failed")
  }
}

export const uploadVideo = async (req, res, next) => {

  try {

    const { filePath, title } = req.body

    const result = await uploadVideoToYouTube({
      filePath,
      title,
      description: title,
      tags: ["AI", "Shorts", "Automation"]
    })

    res.json({
      success: true,
      videoId: result.id
    })

  } catch (error) {
    next(error)
  }
}