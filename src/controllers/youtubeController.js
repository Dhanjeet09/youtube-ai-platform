import { oauth2Client } from "../config/youtube.js"
import { uploadVideoToYouTube } from "../services/youtubeService.js"
import fs from "fs"
import path from "path"

export const getAuthUrl = (req, res) => {
  const url = oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: ["https://www.googleapis.com/auth/youtube.upload"],
    prompt: "consent"
  })
  res.json({ authUrl: url })
}

export const getAuthStatus = (req, res) => {
  const isAuthenticated = fs.existsSync("youtube-token.json")
  res.json({ authenticated: isAuthenticated })
}

export const youtubeAuth = (req, res) => {
  const url = oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: ["https://www.googleapis.com/auth/youtube.upload"],
    prompt: "consent"
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

    res.send("<script>window.opener?.postMessage('youtube-auth-success', '*');window.close();</script>")

  } catch (error) {
    console.error(error)
    res.status(500).send("Auth failed")
  }
}

export const uploadVideo = async (req, res, next) => {

  try {

    const { filePath, title } = req.body

    // Input validation
    if (!filePath || typeof filePath !== "string") {
      return res.status(400).json({
        success: false,
        error: "'filePath' is required and must be a string"
      })
    }

    if (!title || typeof title !== "string") {
      return res.status(400).json({
        success: false,
        error: "'title' is required and must be a string"
      })
    }

    // Path traversal protection: resolve the path and ensure it's within
    // the expected assets directory. Prevents reading arbitrary server files.
    const resolvedPath = path.resolve(filePath)
    const allowedDir = path.resolve("assets/generated")

    if (!resolvedPath.startsWith(allowedDir)) {
      return res.status(400).json({
        success: false,
        error: "filePath must be within the assets/generated directory"
      })
    }

    if (!fs.existsSync(resolvedPath)) {
      return res.status(404).json({
        success: false,
        error: "Video file not found at the specified path"
      })
    }

    const result = await uploadVideoToYouTube({
      filePath: resolvedPath,
      title: title.trim(),
      description: title.trim(),
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