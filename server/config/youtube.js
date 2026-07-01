/**
 * YouTube OAuth2 client configuration.
 *
 * OAuth tokens are stored in MongoDB via the ServerCredential model
 * (AES-256-CBC encrypted at rest).
 *
 * NOTE: The legacy youtube-token.json file fallback has been REMOVED.
 * All token storage now relies entirely on MongoDB-backed credential storage.
 * If MongoDB is unavailable, token operations will fail with a clear error.
 */

import { google } from "googleapis"
import { log } from "../utils/logger.js"

const oauth2Client = new google.auth.OAuth2(
  process.env.YT_CLIENT_ID,
  process.env.YT_CLIENT_SECRET,
  process.env.YT_REDIRECT_URI
)

// ── Token persistence ──────────────────────────────────────────────────────

/**
 * Load tokens from MongoDB-backed credential store.
 * Called once at startup and after every token refresh.
 * 
 * @throws {Error} If MongoDB is unavailable or ServerCredential model fails
 */
export async function loadTokens() {
  const { default: ServerCredential } = await import(
    "../database/models/ServerCredential.js"
  )
  const tokens = await ServerCredential.retrieve("youtube-oauth")
  if (tokens) {
    oauth2Client.setCredentials(tokens)
    return tokens
  }

  return null
}

/**
 * Persist tokens to MongoDB via the ServerCredential model.
 * 
 * @throws {Error} If MongoDB is unavailable or storage fails
 */
export async function saveTokens(tokens) {
  const { default: ServerCredential } = await import(
    "../database/models/ServerCredential.js"
  )
  await ServerCredential.store(
    "youtube-oauth",
    tokens,
    "YouTube OAuth2 tokens (auto-managed)"
  )
}

// ── Auto-token refresh ─────────────────────────────────────────────────────

// When the OAuth2 client automatically refreshes the access token, persist the
// new tokens so we don't lose the refresh_token.
oauth2Client.on("tokens", (tokens) => {
  if (tokens.refresh_token) {
    saveTokens(tokens).catch((err) =>
      log("ERROR", "Failed to persist refreshed tokens", { error: err.message })
    )
  }
})

// ── Initial load ───────────────────────────────────────────────────────────

// Kick off token loading (non-blocking; tokens will be set when ready).
loadTokens().catch((err) =>
  log("ERROR", "Token load failed", { error: err.message })
)

export { oauth2Client }

export const youtube = google.youtube({
  version: "v3",
  auth: oauth2Client,
})
