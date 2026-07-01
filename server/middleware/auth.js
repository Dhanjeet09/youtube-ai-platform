/**
 * API Key Authentication Middleware
 *
 * All `/api/*` routes (except health check `/`) require a valid API key
 * passed via the `Authorization: Bearer <API_KEY>` header.
 *
 * Security hardening:
 *  - Timing-safe comparison to prevent timing attacks
 *  - Consistent 401 response (no detail on why)
 *  - OPTIONS requests are always allowed (CORS preflight)
 *  - Missing/invalid keys return the same error message
 *  - Auth is NOT bypassed in development — use explicit AUTH_DISABLED flag
 */

import crypto from "crypto"
import { log } from "../utils/logger.js"

const UNAUTHORIZED = { success: false, message: "Unauthorized" }

export const apiAuth = (req, res, next) => {
  // Allow CORS preflight requests through
  if (req.method === "OPTIONS") {
    return next()
  }

  // Allow health check endpoint
  if (req.path === "/" || req.path === "") {
    return next()
  }

  // ⚠️  SECURITY CRITICAL: Use explicit AUTH_DISABLED flag, NOT NODE_ENV check.
  // The old code (NODE_ENV !== "production") meant any exposed development
  // server was completely unprotected. Only use this for local-only dev.
  if (process.env.AUTH_DISABLED === "true") {
    log("WARN", "Authentication is DISABLED via AUTH_DISABLED=true. Set AUTH_DISABLED=false in production.")
    return next()
  }

  const apiKey = process.env.API_KEY

  // If no API_KEY is configured, deny all requests (fail closed)
  if (!apiKey) {
    log("ERROR", "API_KEY environment variable is not set. Set API_KEY in .env to enable authentication.")
    return res.status(401).json(UNAUTHORIZED)
  }

  // Warn if API key looks like a placeholder or is too short
  if (apiKey.includes("REPLACE_WITH") || apiKey.length < 20) {
    log("WARN", "API_KEY appears to be a placeholder or too short. Generate a strong key with: openssl rand -hex 32")
  }

  const authHeader = req.headers.authorization

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json(UNAUTHORIZED)
  }

  const token = authHeader.slice(7) // Remove "Bearer " prefix

  // Timing-safe comparison to prevent timing attacks
  try {
    const expected = Buffer.from(apiKey)
    const actual = Buffer.from(token)

    if (expected.length !== actual.length) {
      return res.status(401).json(UNAUTHORIZED)
    }

    if (!crypto.timingSafeEqual(expected, actual)) {
      return res.status(401).json(UNAUTHORIZED)
    }
  } catch {
    return res.status(401).json(UNAUTHORIZED)
  }

  next()
}
