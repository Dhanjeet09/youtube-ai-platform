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
 * YouTube upload rate limiter: 3 requests per hour per IP.
 */
export const youtubeLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
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
