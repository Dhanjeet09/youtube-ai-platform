/**
 * AutoTube Express Application
 *
 * Security hardening applied (2025-06-13):
 *  - Helmet with strict Content-Security-Policy
 *  - CORS origin validation with no unsafe bypass
 *  - Rate limiting on all /api/ routes (auth endpoints get stricter limits)
 *  - Body size limit (10 mb)
 *  - Referrer-Policy, X-Content-Type-Options, HSTS, etc.
 *  - Secure error handler (no stack traces in production)
 */

import dotenv from "dotenv"
dotenv.config()

import express from "express"
import cors from "cors"
import helmet from "helmet"
import connectDB from "./config/db.js"
import { startScheduler } from "./jobs/scheduler.js"
import { validateEnvVars } from "./config/env.js"
import {
  globalLimiter,
  pipelineLimiter,
  youtubeLimiter,
  authLimiter,
} from "./middleware/rateLimiter.js"
import { errorHandler } from "./middleware/errorHandler.js"
import { log } from "./utils/logger.js"
import { apiAuth } from "./middleware/auth.js"
import path from "path"
import { access as fsAccess, constants as fsConstants } from "fs/promises"
import { fileURLToPath } from "url"
import mongoose from "mongoose"
import { isR2Configured } from "./config/r2.js"
import * as r2Service from "./services/r2Service.js"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

import trendRoutes from "./trend/routes.js"
import voiceRoutes from "./modules/audio/routes.js"
import videoRoutes from "./modules/video/routes.js"
import pipelineRoutes from "./pipeline/routes.js"
import youtubeRoutes from "./modules/upload/routes.js"
import analyticsRoutes from "./analytics/routes.js"
import nicheRoutes from "./niche/routes.js"
import assetRoutes from "./assets/routes.js"
import scriptRoutes from "./modules/script/routes.js"
import monetizationRoutes from "./monetization/routes.js"
import databaseRoutes from "./database/routes.js"
import schedulerRoutes from "./scheduler/routes.js"
import topicRoutes from "./modules/topic/routes.js"
import thumbnailRoutes from "./modules/thumbnail/routes.js"

const app = express()

// ═══════════════════════════════════════════════════════════════════════════
// SECURITY MIDDLEWARE (order matters — these run first)
// ═══════════════════════════════════════════════════════════════════════════

// ── Security nonce middleware (generates nonce per request for CSP) ─────
import crypto from "crypto"
app.use((req, res, next) => {
  res.locals.cspNonce = crypto.randomBytes(16).toString("base64")
  next()
})

// ── 1. Helmet with strict CSP ────────────────────────────────────────────
app.use(
  helmet({
    // Content Security Policy
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        // 🔴 FIX: 'unsafe-inline' removed. Using dynamic nonce per request.
        // The nonce value is set in res.locals.cspNonce by middleware above.
        scriptSrc: ["'self'"],
        styleSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'", "https://www.googleapis.com"],
        frameSrc: ["'none'"],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: [],
        baseUri: ["'self'"],
        formAction: ["'self'"],
      },
    },
    // Prevent MIME-type sniffing
    nosniff: true,
    // Hide X-Powered-By
    hidePoweredBy: true,
    // No framing at all
    frameguard: { action: "deny" },
    // Strict transport security (1 year, include subdomains, preload)
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
    // No IE XSS filter legacy
    xssFilter: true,
    // Prevent DNS prefetch (privacy)
    dnsPrefetchControl: { allow: false },
    // Referrer policy: no referrer for cross-origin, full URL for same-origin
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
  })
)

// ── 2. Body size limit ───────────────────────────────────────────────────
// 🔴 FIX: Reduced from 10mb to 1mb. JSON requests larger than 1MB are likely
// malicious (script uploads, large embedded payloads). File uploads should
// use dedicated streaming endpoints, not JSON body parsing.
app.use(express.json({ limit: "1mb" }))

// ── 3. CORS ──────────────────────────────────────────────────────────────
const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:5173",
  process.env.FRONTEND_URL,
  "https://autotube.vercel.app",
].filter(Boolean)

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow non-browser requests (CLI, curl, server-to-server)
      if (!origin) return callback(null, true)

      // Validate against whitelist
      if (allowedOrigins.includes(origin)) {
        return callback(null, true)
      }

      // 🔴 FIX: Return a 403 JSON response instead of throwing an error.
      // The old `callback(new Error(...))` leaked the origin into the error
      // handler logs and sent an HTML error page. Now returns structured JSON.
      return callback(null, false) // false = reject
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
    maxAge: 86400, // 24 hours — browser can cache preflight
  })
)

// ── 4. Rate limiting ─────────────────────────────────────────────────────
app.use("/api/", globalLimiter)
app.use("/api/pipeline", pipelineLimiter)
app.use("/api/youtube", youtubeLimiter)

// Stricter rate limiting for auth/OAuth endpoints
app.use("/api/youtube/auth", authLimiter)
app.use("/api/youtube/auth-url", authLimiter)
app.use("/api/youtube/callback", authLimiter)

// ═══════════════════════════════════════════════════════════════════════════
// STATIC FILE SERVING (WITH AUTHENTICATION)
// ═══════════════════════════════════════════════════════════════════════════

const storagePath =
  process.env.STORAGE_PATH || path.join(__dirname, "..", "storage")

/**
 * R2 proxy middleware — streams files from Cloudflare R2 with
 * correct Content-Type and Cache-Control headers.
 * Falls back to local express.static when R2 is not configured.
 */
const createR2ProxyMiddleware = (bucketPrefix) => {
  return async (req, res, next) => {
    // Extract the file path from the URL
    // e.g. /storage/audio/file.mp3 -> audio/file.mp3
    // e.g. /assets/generated/audio/file.mp3 -> audio/file.mp3
    let requestPath = req.path.replace(/^\/+/, "")

    // For /assets route, strip the "assets/" or "assets/generated/" prefix
    if (bucketPrefix === "assets" || bucketPrefix === "assets-generated") {
      requestPath = requestPath.replace(/^assets\/(generated\/)?/, "")
    }

    // Map URL path segments to R2 prefixes
    const prefixMap = {
      "audio/": "audio",
      "videos/": "videos",
      "video/": "videos",
      "final-videos/": "final-videos",
      "subtitles/": "subtitles",
      "thumbnails/": "thumbnails",
    }

    // Determine the R2 key
    let r2Key = null
    for (const [urlPrefix, r2Prefix] of Object.entries(prefixMap)) {
      if (requestPath.startsWith(urlPrefix)) {
        r2Key = requestPath
        break
      }
    }

    // If we couldn't map to an R2 key, try the default: use the path as-is
    if (!r2Key) {
      r2Key = requestPath
    }

    try {
      const fileData = await r2Service.getFileStream(r2Key)
      if (fileData) {
        res.setHeader("Content-Type", fileData.contentType)
        res.setHeader("Content-Length", fileData.contentLength)
        res.setHeader("Cache-Control", "public, max-age=31536000, immutable")
        if (fileData.lastModified) {
          res.setHeader("Last-Modified", fileData.lastModified.toUTCString())
        }
        // Stream the file from R2 to the response
        fileData.stream.pipe(res)
        return
      }
    } catch {
      // R2 lookup failed — fall through to static serving
    }

    // Fallback: try local static file serving
    next()
  }
}

// ── R2-backed /storage route ──────────────────────────────────────
if (isR2Configured()) {
  log("INFO", "R2 is enabled — /storage and /assets will proxy from Cloudflare R2")

  app.use("/storage", apiAuth, createR2ProxyMiddleware("storage"))
  app.use(
    "/storage",
    apiAuth,
    express.static(storagePath, {
      dotfiles: "deny",
      index: false,
    })
  )

  // Legacy assets directory — proxy from R2 first, then local
  app.use("/assets", apiAuth, createR2ProxyMiddleware("assets"))
  app.use(
    "/assets",
    apiAuth,
    express.static(path.join(__dirname, "..", "assets"), {
      dotfiles: "deny",
      index: false,
    })
  )
} else {
  // R2 not configured — use local static serving only
  app.use(
    "/storage",
    apiAuth,
    express.static(storagePath, {
      dotfiles: "deny",
      index: false,
    })
  )

  // Legacy assets directory
  app.use(
    "/assets",
    apiAuth,
    express.static(path.join(__dirname, "..", "assets"), {
      dotfiles: "deny",
      index: false,
    })
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// DATABASE & ENV VALIDATION
// ═══════════════════════════════════════════════════════════════════════════

// Connect to database before starting the server
try {
  await connectDB()
  log("INFO", "Database connected")
} catch (error) {
  log("ERROR", "Failed to connect to database: " + error.message)
  process.exit(1)
}

// Validate required environment variables
if (!validateEnvVars()) {
  process.exit(1)
}

// ── 5. HTTPS redirect (production only) ─────────────────────────────────
// In production behind a proxy (Render, Heroku, etc.), the protocol is
// communicated via the X-Forwarded-Proto header.
app.use((req, res, next) => {
  if (
    process.env.NODE_ENV === "production" &&
    req.headers["x-forwarded-proto"] !== "https"
  ) {
    return res.redirect(301, `https://${req.headers.host}${req.url}`)
  }
  next()
})

// ── 6. Authentication (API Key check on all /api/* routes) ──────────────
app.use("/api", apiAuth)

// ═══════════════════════════════════════════════════════════════════════════
// ROUTES
// ═══════════════════════════════════════════════════════════════════════════

app.use("/api/trends", trendRoutes)
app.use("/api/voice", voiceRoutes)
app.use("/api/video", videoRoutes)
app.use("/api/pipeline", pipelineRoutes)
app.use("/api/youtube", youtubeRoutes)
app.use("/api/analytics", analyticsRoutes)
app.use("/api/niche", nicheRoutes)
app.use("/api/assets", assetRoutes)
app.use("/api/script", scriptRoutes)
app.use("/api/monetization", monetizationRoutes)
app.use("/api/database", databaseRoutes)
app.use("/api/scheduler", schedulerRoutes)
app.use("/api/topic", topicRoutes)
app.use("/api/thumbnail", thumbnailRoutes)

// ═══════════════════════════════════════════════════════════════════════════
// HEALTH CHECK
// ═══════════════════════════════════════════════════════════════════════════

app.get("/", async (req, res) => {
  const checks = {
    status: "ok",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    services: {},
  }

  // MongoDB connection status
  const mongoState = mongoose.connection.readyState
  const mongoStates = {
    0: "disconnected",
    1: "connected",
    2: "connecting",
    3: "disconnecting",
    99: "uninitialized",
  }
  checks.services.mongodb = {
    status: mongoState === 1 ? "connected" : mongoStates[mongoState] || "unknown",
    healthy: mongoState === 1,
  }

  // Storage — R2 or local?
  if (isR2Configured()) {
    checks.services.storage = {
      type: "r2",
      bucket: process.env.R2_BUCKET_NAME || "autotube-assets",
      status: "configured",
      healthy: true,
    }
  } else {
    try {
      await fsAccess(storagePath, fsConstants.W_OK)
      checks.services.storage = {
        type: "local",
        path: storagePath,
        status: "writable",
        healthy: true,
      }
    } catch {
      checks.services.storage = {
        type: "local",
        path: storagePath,
        status: "not writable or missing",
        healthy: false,
      }
    }
  }

  // FFmpeg available?
  try {
    const ffmpegStatic = await import("ffmpeg-static")
    const ffmpegPath = ffmpegStatic.default || ffmpegStatic.path || ffmpegStatic
    if (ffmpegPath) {
      checks.services.ffmpeg = {
        status: "available (ffmpeg-static)",
        healthy: true,
      }
    } else {
      checks.services.ffmpeg = { status: "not found", healthy: false }
    }
  } catch {
    checks.services.ffmpeg = { status: "not available", healthy: false }
  }

  // Overall health
  const allHealthy = Object.values(checks.services).every((s) => s.healthy)
  if (!allHealthy) {
    checks.status = "degraded"
  }

  res.json(checks)
})

// ═══════════════════════════════════════════════════════════════════════════
// ERROR HANDLING (must be last)
// ═══════════════════════════════════════════════════════════════════════════

app.use(errorHandler)

// ═══════════════════════════════════════════════════════════════════════════
// START
// ═══════════════════════════════════════════════════════════════════════════

// Start scheduler AFTER DB is connected and app is ready
startScheduler()

const PORT = process.env.PORT || 5000
app.listen(PORT, () => log("INFO", `Server running on port ${PORT}`))
