import { oauth2Client } from "../config/youtube.js"
import fs from "fs"

export const saveYouTubeToken = async (code) => {

  const { tokens } = await oauth2Client.getToken(code)

  oauth2Client.setCredentials(tokens)

  fs.writeFileSync(
    "youtube-token.json",
    JSON.stringify(tokens, null, 2)
  )

  console.log("✅ YouTube token saved")
}