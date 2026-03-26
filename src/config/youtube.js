import { google } from "googleapis"
import fs from "fs"
import dotenv from "dotenv"
dotenv.config()

const oauth2Client = new google.auth.OAuth2(
  process.env.YT_CLIENT_ID,
  process.env.YT_CLIENT_SECRET,
  process.env.YT_REDIRECT_URI
)

// Load token if exists — wrapped in try/catch so malformed JSON doesn't crash the app
if (fs.existsSync("youtube-token.json")) {
  try {
    const tokens = JSON.parse(fs.readFileSync("youtube-token.json", "utf-8"))
    oauth2Client.setCredentials(tokens)
  } catch (error) {
    console.error("Failed to parse youtube-token.json:", error.message)
    console.error("You may need to re-authenticate via /api/youtube/auth")
  }
}

export { oauth2Client }

export const youtube = google.youtube({
  version: "v3",
  auth: oauth2Client
})