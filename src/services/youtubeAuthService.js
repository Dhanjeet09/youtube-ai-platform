import { oauth2Client } from "../config/youtube.js"
import open from "open"

export const authenticateYouTube = async () => {

  const url = oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: [
      "https://www.googleapis.com/auth/youtube.upload"
    ]
  })

  console.log("Authorize this app by visiting:", url)

  await open(url)
}