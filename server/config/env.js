/**
 * Environment variable validation and configuration.
 * Validates required vars and warns about optional ones on startup.
 *
 * Security: credentials and secrets are never logged or leaked.
 * Only the *names* of missing variables are shown, never their values.
 */

import { log } from "../utils/logger.js"

const REQUIRED_ENV_VARS = [
  { name: "GROQ_API_KEY", description: "Groq AI API Key for script generation" },
  { name: "PEXELS_API_KEY", description: "Pexels API Key for video footage" },
  { name: "API_KEY", description: "API key for authenticating requests to the backend (generate with: openssl rand -hex 32)" },
  { name: "JWT_SECRET", description: "JWT secret for signing auth tokens (generate with: openssl rand -hex 32)" },
  { name: "MONGODB_URI", description: "MongoDB connection string (app fails to start without it)" },
]

const OPTIONAL_ENV_VARS = [
  { name: "MONGO_URI", description: "Fallback MongoDB connection string (used if MONGODB_URI is not set)" },
  { name: "GROQ_MODEL", description: "Groq AI model name (e.g. llama-3.3-70b-versatile)" },
  { name: "YT_CLIENT_ID", description: "YouTube OAuth Client ID" },
  { name: "YT_CLIENT_SECRET", description: "YouTube OAuth Client Secret" },
  { name: "YT_REDIRECT_URI", description: "YouTube OAuth Redirect URI" },
  { name: "YOUTUBE_API_KEY", description: "YouTube Data API Key" },
  { name: "SERVERLESS", description: "Set to 'true' to disable scheduler (e.g. on Render free tier)" },
  { name: "WORLD_CUP_MODE", description: "Set to 'true' to enable World Cup match-driven content scheduling" },
  { name: "FRONTEND_URL", description: "Frontend URL for CORS (e.g. https://autotube.vercel.app)" },
  { name: "STORAGE_PATH", description: "Path to storage directory for generated assets (default: ./storage)" },
  { name: "CREDENTIAL_ENCRYPTION_KEY", description: "AES-256 encryption key for stored OAuth tokens (openssl rand -hex 32)" },
  // ─── R2 / Cloudflare Object Storage ───────────────────────────
  { name: "R2_ENABLED", description: "Set to 'true' to enable Cloudflare R2 object storage (default: false in dev, true in prod)" },
  { name: "R2_ACCOUNT_ID", description: "Cloudflare R2 Account ID (from R2 dashboard)" },
  { name: "R2_ACCESS_KEY_ID", description: "Cloudflare R2 API Access Key ID" },
  { name: "R2_SECRET_ACCESS_KEY", description: "Cloudflare R2 API Secret Access Key" },
  { name: "R2_BUCKET_NAME", description: "Cloudflare R2 bucket name (default: autotube-assets)" },
  { name: "R2_PUBLIC_URL", description: "Optional public URL for serving R2 files directly (e.g. https://assets.autotube.com)" },
]

export const validateEnvVars = () => {
  const missing = []
  const warnings = []
  const securityWarnings = []

  for (const env of REQUIRED_ENV_VARS) {
    // Special case: MONGODB_URI can fall back to MONGO_URI
    if (env.name === "MONGODB_URI" && !process.env.MONGODB_URI && process.env.MONGO_URI) {
      continue
    }
    if (!process.env[env.name]) {
      missing.push(env)
    }
  }

  for (const env of OPTIONAL_ENV_VARS) {
    if (!process.env[env.name]) {
      warnings.push(env)
    }
  }

  // ── Conditionally required: R2 credentials when R2 is enabled ───
  if (
    process.env.R2_ENABLED === "true" &&
    (!process.env.R2_ACCOUNT_ID || !process.env.R2_ACCESS_KEY_ID || !process.env.R2_SECRET_ACCESS_KEY)
  ) {
    securityWarnings.push(
      "R2_ENABLED=true but R2 credentials are incomplete. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, " +
      "and R2_SECRET_ACCESS_KEY, or set R2_ENABLED=false to use local storage."
    )
  }

  // ── Security-specific checks ──────────────────────────────────────

  // Warn if NODE_ENV is not production and we're in a deployed env
  if (
    process.env.NODE_ENV !== "production" &&
    process.env.RENDER === "true"
  ) {
    securityWarnings.push(
      "NODE_ENV is not set to 'production' on Render. Set it to 'production' for secure error handling."
    )
  }

  // Warn if CREDENTIAL_ENCRYPTION_KEY is missing but YouTube OAuth is configured
  if (
    !process.env.CREDENTIAL_ENCRYPTION_KEY &&
    (process.env.YT_CLIENT_ID || process.env.YT_CLIENT_SECRET)
  ) {
    securityWarnings.push(
      "CREDENTIAL_ENCRYPTION_KEY is not set. YouTube OAuth tokens will be stored in plaintext " +
      "as a local file. Add CREDENTIAL_ENCRYPTION_KEY to .env (generate with: openssl rand -hex 32)."
    )
  }

  // ── Output ────────────────────────────────────────────────────────

  if (missing.length > 0) {
    log("ERROR", "Missing required environment variables")
    missing.forEach((e) => log("ERROR", `   - ${e.name}: ${e.description}`))
    log("ERROR", "Please set these in your .env file or environment.")
    return false
  }

  if (warnings.length > 0) {
    log("WARN", "Optional environment variables not set")
    warnings.forEach((e) => log("WARN", `   - ${e.name}: ${e.description}`))
    log("WARN", "Some features may be limited.")
  } else {
    log("INFO", "All optional environment variables configured")
  }

  if (securityWarnings.length > 0) {
    log("WARN", "Security Warnings")
    securityWarnings.forEach((w) => log("WARN", `   • ${w}`))
  }

  return true
}
