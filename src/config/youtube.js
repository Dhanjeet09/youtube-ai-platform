import { google } from "googleapis"
import fs from "fs"
import dotenv from "dotenv"
dotenv.config()

const oauth2Client = new google.auth.OAuth2(
  process.env.YT_CLIENT_ID,
  process.env.YT_CLIENT_SECRET,
  process.env.YT_REDIRECT_URI
)

// Load token if exists
if (fs.existsSync("youtube-token.json")) {
  const tokens = JSON.parse(fs.readFileSync("youtube-token.json"))
  oauth2Client.setCredentials(tokens)
}

export { oauth2Client }

export const youtube = google.youtube({
  version: "v3",
  auth: oauth2Client
})