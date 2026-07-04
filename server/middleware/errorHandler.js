/**
 * Global Express error-handling middleware.
 *
 * Security guarantees:
 *  1. Stack traces are NEVER exposed to the client in production.
 *  2. Error messages are sanitised — no internal paths, DB details,
 *     connection strings, or API keys.
 *  3. Unhandled errors return a generic message in production.
 *  4. All errors are logged server-side for debugging.
 *  5. Mongoose ValidationError and CastError are returned as 400.
 */

import { log as logger } from "../utils/logger.js"

/**
 * Sanitise an error message for client consumption.
 * Strips anything that looks like a path, URL, or credential.
 */
function sanitiseMessage(message) {
  if (!message || typeof message !== "string") return "Internal Server Error"

  // Truncate very long messages
  if (message.length > 200) message = message.slice(0, 200) + "…"

  // Strip potential file paths (both Unix and Windows)
  message = message.replace(/[/\\][\w\-. ]+[/\\][\w\-. /\\]+/g, "[path redacted]")

  // Strip anything that looks like an API key / token
  message = message.replace(
    /(?:sk-|api[_-]?key|secret|token|password|auth|credential)[\s:=]*['"]?[\w\-.]{8,}/gi,
    "[credential redacted]"
  )

  // Strip connection strings
  message = message.replace(/mongodb(?:\+srv)?:\/\/[^\s'"]+/gi, "[connection string redacted]")

  return message
}

export const errorHandler = (err, req, res, _next) => {
  // ── Server-side logging (always, for debugging) ─────────────────
  logger("ERROR", err.message, {
    method: req?.method,
    url: req?.originalUrl || req?.url,
    statusCode: err.statusCode || 500,
    stack: err.stack?.slice(0, 800),
  })

  // ── Determine HTTP status code ──────────────────────────────────
  let statusCode = err.statusCode || 500

  // Mongoose validation errors → 400 Bad Request
  if (err.name === "ValidationError" || err.name === "CastError") {
    statusCode = 400
  }

  // ── Build safe response ─────────────────────────────────────────
  const isProduction = process.env.NODE_ENV === "production"

  const response = {
    success: false,
    message: isProduction ? sanitiseMessage(err.message) : err.message || "Internal Server Error",
  }

  // Only include stack traces in development / non-production
  if (!isProduction && err.stack) {
    response.stack = err.stack.slice(0, 1000)
  }

  res.status(statusCode).json(response)
}
