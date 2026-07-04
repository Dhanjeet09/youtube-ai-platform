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

// ── Lazy-initialized OAuth2 client ──────────────────────────────────────
// ES module imports are hoisted — this file is loaded BEFORE dotenv.config()
// in app.js. We must create the OAuth2 client lazily so env vars are available.
let _oauth2Client = null

function getOAuth2Client() {
  if (!_oauth2Client) {
    _oauth2Client = new google.auth.OAuth2(
      process.env.YT_CLIENT_ID,
      process.env.YT_CLIENT_SECRET,
      process.env.YT_REDIRECT_URI
    )

    // ── Auto-token refresh ─────────────────────────────────────────────
    _oauth2Client.on("tokens", (tokens) => {
      if (tokens.refresh_token) {
        saveTokens(tokens).catch((err) =>
          log("ERROR", "Failed to persist refreshed tokens", { error: err.message })
        )
      }
    })
  }
  return _oauth2Client
}

// ── Singleton init promise ───────────────────────────────────────────
// Ensures loadTokens() runs exactly once and is awaited by all callers.
let _initPromise = null

/**
 * Ensure the YouTube OAuth2 client has tokens loaded from MongoDB.
 * Safe to call multiple times — the actual DB read happens only once.
 * Subsequent calls return immediately with the cached client.
 *
 * @returns {Promise<object>} The initialized OAuth2 client instance
 */
export async function ensureYouTubeAuth() {
  const client = getOAuth2Client()
  if (!_initPromise) {
    _initPromise = loadTokens()
      .then((tokens) => {
        if (tokens) log("INFO", "YouTube tokens loaded")
        else log("WARN", "No YouTube tokens found")
        return tokens
      })
      .catch((err) => {
        log("ERROR", "Token load failed", { error: err.message })
        return null
      })
  }
  await _initPromise
  return client
}

// ── Token persistence ──────────────────────────────────────────────────────

export async function loadTokens() {
  const { default: ServerCredential } = await import(
    "../database/models/ServerCredential.js"
  )
  const tokens = await ServerCredential.retrieve("youtube-oauth")
  if (tokens) {
    getOAuth2Client().setCredentials(tokens)
    return tokens
  }
  return null
}

export async function saveTokens(newTokens) {
  const { default: ServerCredential } = await import(
    "../database/models/ServerCredential.js"
  )
  // Merge with existing tokens so we don't overwrite fields like
  // refresh_token when only an access_token update is received.
  const existing = await ServerCredential.retrieve("youtube-oauth")
  const merged = { ...existing, ...newTokens }
  await ServerCredential.store(
    "youtube-oauth",
    merged,
    "YouTube OAuth2 tokens (auto-managed)"
  )
}

// Export a getter that lazily creates the client
// Consumers use: getOAuth2Client() or oauth2Client
export { getOAuth2Client as oauth2Client }

// Lazy youtube instance
let _youtube = null
export function getYoutube() {
  if (!_youtube) {
    _youtube = google.youtube({
      version: "v3",
      auth: getOAuth2Client(),
    })
  }
  return _youtube
}

// For backward compatibility
export const youtube = {
  get videos() { return getYoutube().videos },
  get channels() { return getYoutube().channels },
}
