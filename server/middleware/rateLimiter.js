/**
 * Rate limiting configuration.
 *
 * Security hardening:
 *  - Consistent error responses (no implementation details leaked)
 *  - Stricter limits for auth-related endpoints
 *  - Standardised error format matching the app's API convention
 */

import rateLimit from "express-rate-limit"

/**
 * Standard error message for rate-limited requests.
 * Deliberately vague — does not reveal the limit or window.
 */
const RATE_LIMIT_MESSAGE = { success: false, message: "Too many requests. Please try again later." }

/**
 * Global rate limiter: 100 requests per 15 minutes per IP.
 */
export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: RATE_LIMIT_MESSAGE,
})

/**
 * Pipeline rate limiter: 5 requests per hour per IP.
 */
export const pipelineLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: RATE_LIMIT_MESSAGE,
})

/**
 * YouTube upload rate limiter: 10 requests per hour per IP.
 * Applied only to write operations (upload, delete).
 */
export const youtubeLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: RATE_LIMIT_MESSAGE,
})

/**
 * YouTube read rate limiter: 30 requests per 15 minutes per IP.
 * Applied to read-only endpoints (status, channel, analytics).
 */
export const youtubeReadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: RATE_LIMIT_MESSAGE,
})

/**
 * Auth endpoint rate limiter: 10 requests per minute per IP.
 * Applied to OAuth URLs and token endpoints.
 */
export const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: RATE_LIMIT_MESSAGE,
})

/**
 * Login / account-creation endpoint rate limiter: 5 requests per minute.
 * Stricter to slow brute-force / credential-stuffing attacks.
 */
export const strictAuthLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: RATE_LIMIT_MESSAGE,
})

/**
 * AI script generation rate limiter: 10 requests per 15 minutes per IP.
 * Protects Groq API usage from abuse.
 */
export const scriptLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: RATE_LIMIT_MESSAGE,
})

/**
 * Voice generation rate limiter: 10 requests per 15 minutes per IP.
 * Protects Google TTS API usage from abuse.
 */
export const voiceLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: RATE_LIMIT_MESSAGE,
})

/**
 * Video download rate limiter: 5 requests per hour per IP.
 * Protects Pexels API usage from abuse.
 */
export const videoDownloadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: RATE_LIMIT_MESSAGE,
})

/**
 * Analytics endpoint rate limiter: 20 requests per 15 minutes per IP.
 * Protects YouTube Data API usage from abuse.
 */
export const analyticsLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: RATE_LIMIT_MESSAGE,
})

/**
 * Settings/Danger zone rate limiter: 5 requests per minute per IP.
 * Protects destructive operations from abuse.
 */
export const settingsLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: RATE_LIMIT_MESSAGE,
})

/**
 * Poem routes rate limiter: 10 requests per 15 minutes per IP.
 * Protects poem generation and video creation from abuse.
 */
export const poemLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: RATE_LIMIT_MESSAGE,
})
