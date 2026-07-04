/**
 * YouTube OAuth & Upload Controller
 *
 * Security hardening applied:
 *  - CSRF protection via OAuth `state` parameter (random nonce stored in session / DB)
 *  - `postMessage` origin is validated (no wildcard / open redirect)
 *  - Tokens stored via ServerCredential model (encrypted at rest)
 *  - Path traversal protection for file-upload paths
 *  - No secrets leaked in error responses
 */

import { oauth2Client, saveTokens } from "../../config/youtube.js"
import { uploadVideoToYouTube } from "./service.js"
import { log as logger } from "../../utils/logger.js"
import crypto from "crypto"
import path from "path"
import fs from "fs"

// oauth2Client is now the getOAuth2Client function — call it to get the client
const getClient = oauth2Client

/**
 * Generate a cryptographically random state nonce and store it in MongoDB.
 * Uses OAuthState model with TTL index for automatic expiration.
 * @returns {Promise<{ state: string, verifier: string }>}
 */
async function generateOAuthState() {
  const state = crypto.randomBytes(32).toString("hex")
  const verifier = crypto.randomBytes(32).toString("hex")
  const { default: OAuthState } = await import("../../database/models/OAuthState.js")
  await OAuthState.store(state, verifier, 10 * 60 * 1000)
  return { state, verifier }
}

/**
 * Validate and consume an OAuth state nonce from MongoDB (one-time use).
 * @param {string} state
 * @returns {Promise<boolean>}
 */
async function validateOAuthState(state) {
  if (!state || typeof state !== "string") return false
  const { default: OAuthState } = await import("../../database/models/OAuthState.js")
  return OAuthState.validateAndConsume(state)
}

// ── Allowed frontend origins for postMessage ──────────────────────────
const ALLOWED_POSTMESSAGE_ORIGINS = [
  "http://localhost:3000",
  "http://localhost:5173",
  process.env.FRONTEND_URL,
].filter(Boolean)

// ── Controllers ───────────────────────────────────────────────────────

export const getAuthUrl = async (req, res) => {
  const { state } = await generateOAuthState()
  const url = getClient().generateAuthUrl({
    access_type: "offline",
    scope: ["https://www.googleapis.com/auth/youtube.upload"],
    prompt: "consent",
    state, // CSRF protection
  })
  res.json({ success: true, data: { authUrl: url } })
}

export const getAuthStatus = async (req, res) => {
  try {
    const { default: ServerCredential } = await import(
      "../../database/models/ServerCredential.js"
    )
    const tokens = await ServerCredential.retrieve("youtube-oauth")
    res.json({ success: true, data: { authenticated: !!tokens } })
  } catch {
    res.json({ success: true, data: { authenticated: false } })
  }
}

export const youtubeAuth = async (req, res) => {
  const { state } = await generateOAuthState()
  const url = getClient().generateAuthUrl({
    access_type: "offline",
    scope: ["https://www.googleapis.com/auth/youtube.upload"],
    prompt: "consent",
    state, // CSRF protection
  })
  res.redirect(url)
}

export const youtubeCallback = async (req, res) => {
  try {
    const { code, state } = req.query

    // ── CSRF check ─────────────────────────────────────────────────
    if (!(await validateOAuthState(state))) {
      return res
        .status(403)
        .send(
          "<h1>Security Error</h1><p>Invalid or expired OAuth state parameter. " +
          "Please initiate the authentication flow again from the application.</p>"
        )
    }

    if (!code) {
      return res.status(400).send("No authorization code provided")
    }

    // Exchange code for tokens
    const { tokens } = await getClient().getToken(code)
    getClient().setCredentials(tokens)

    // Persist tokens securely to MongoDB (encrypted at rest via ServerCredential)
    await saveTokens(tokens)

    // ── postMessage back to the frontend ───────────────────────────
    // Validate the origin — NEVER use a wildcard or open redirect.
    const frontendUrl = (process.env.FRONTEND_URL || "http://localhost:3000").replace(/\/+$/, "")
    const allowed = ALLOWED_POSTMESSAGE_ORIGINS.includes(frontendUrl)
    const targetOrigin = allowed ? frontendUrl : ALLOWED_POSTMESSAGE_ORIGINS[0]

    // Use CSP nonce from middleware — avoids needing 'unsafe-inline' in CSP
    const nonce = res.locals?.cspNonce || ""
    const escapedOrigin = targetOrigin.replace(/'/g, "").replace(/</g, "&lt;").replace(/>/g, "&gt;")

    res.send(
      `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Authentication Success</title></head><body>
        <p>Authentication successful. You can close this window.</p>
        <script nonce="${nonce.replace(/"/g, "&quot;")}">
          window.opener?.postMessage('youtube-auth-success', '${escapedOrigin}');
          window.close();
        </script>
      </body></html>`
    )
  } catch (error) {
    logger("ERROR", "[UPLOAD] YouTube OAuth callback failed", {
      error: error.message,
    })
    res.status(500).json({ success: false, message: "Authentication failed" })
  }
}

export const uploadVideo = async (req, res, next) => {
  try {
    // 🔴 FIX: Check YouTube auth status before accepting upload requests.
    // Returns a clear 400 instead of a cryptic Google API error when
    // tokens are missing.
    const { default: ServerCredential } = await import(
      "../../database/models/ServerCredential.js"
    )
    const tokens = await ServerCredential.retrieve("youtube-oauth")
    if (!tokens) {
      return res.status(400).json({
        success: false,
        message: "YouTube not connected. Please authenticate first.",
      })
    }

    const { filePath, title, description } = req.body

    // Input validation
    if (!filePath || typeof filePath !== "string") {
      return res.status(400).json({
        success: false,
        message: "'filePath' is required and must be a string",
      })
    }

    if (!title || typeof title !== "string") {
      return res.status(400).json({
        success: false,
        message: "'title' is required and must be a string",
      })
    }

    const trimmedTitle = title.trim()
    if (trimmedTitle.length < 1 || trimmedTitle.length > 100) {
      return res.status(400).json({
        success: false,
        message: "'title' must be between 1 and 100 characters",
      })
    }

    if (description !== undefined && typeof description !== "string") {
      return res.status(400).json({
        success: false,
        message: "'description' must be a string if provided",
      })
    }

    const trimmedDescription = description ? description.trim() : trimmedTitle
    if (trimmedDescription.length > 5000) {
      return res.status(400).json({
        success: false,
        message: "'description' must not exceed 5000 characters",
      })
    }

    // 🔴 FIX: Path traversal protection — ensure the resolved path is within
    // the expected assets or storage directory. The `startsWith` check now
    // includes a trailing separator to prevent bypass via partial name matches
    // (e.g. "assets/generated-malicious" matching "assets/generated").
    const resolvedPath = path.resolve(filePath)
    const allowedDirs = [
      path.resolve("assets/generated"),
      path.resolve("storage"),
    ]

    const isAllowed = allowedDirs.some(
      (dir) => resolvedPath.startsWith(dir + path.sep) || resolvedPath === dir
    )
    if (!isAllowed) {
      return res.status(400).json({
        success: false,
        message: "filePath must be within the assets/generated or storage directory",
      })
    }

    if (!fs.existsSync(resolvedPath)) {
      return res.status(404).json({
        success: false,
        message: "Video file not found at the specified path",
      })
    }

    const result = await uploadVideoToYouTube({
      filePath: resolvedPath,
      title: trimmedTitle,
      description: trimmedDescription,
      tags: ["AI", "Shorts", "Automation"],
    })

    res.json({
      success: true,
      videoId: result.id,
    })
  } catch (error) {
    next(error)
  }
}
