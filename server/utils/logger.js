import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const LOG_DIR = path.resolve(__dirname, "..", "..", "logs")

// Ensure logs directory exists
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true })
}

const appLogPath = path.join(LOG_DIR, "app.log")
const errorLogPath = path.join(LOG_DIR, "error.log")

const writeToFile = (level, message, dataStr) => {
  const isProduction = process.env.NODE_ENV === "production"
  if (!isProduction) return

  const line = `[${new Date().toISOString()}] [${level.toUpperCase()}] ${message}${dataStr}\n`

  try {
    fs.appendFileSync(appLogPath, line)
    if (level === "error") {
      fs.appendFileSync(errorLogPath, line)
    }
  } catch (err) {
    console.error(`[LOGGER] Failed to write log file: ${err.message}`)
  }
}

export const log = (level, message, data = {}) => {
  const prefix = `[${level.toUpperCase()}]`
  const ts = new Date().toISOString()
  const dataStr = Object.keys(data).length ? ` ${JSON.stringify(data)}` : ""
  const logLine = `${prefix} ${ts} - ${message}${dataStr}`

  // Always log to console
  console.log(logLine)

  // Write to file in production
  writeToFile(level, message, dataStr)
}
