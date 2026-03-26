import dotenv from "dotenv"
dotenv.config()

import express from "express"
import cors from "cors"
import connectDB from "./config/db.js"
import { startScheduler } from "./services/schedulerService.js"

import trendRoutes from "./routes/trendRoutes.js"
import voiceRoutes from "./routes/voiceRoutes.js"
import videoRoutes from "./routes/videoRoutes.js"
import renderRoutes from "./routes/renderRoutes.js"
import pipelineRoutes from "./routes/pipelineRoutes.js"
import youtubeRoutes from "./routes/youtubeRoutes.js"
import analyticsRoutes from "./routes/analyticsRoutes.js"
import nicheRoutes from "./routes/nicheRoutes.js"
import assetRoutes from "./routes/assetRoutes.js"
import scriptRoutes from "./routes/scriptRoutes.js"
import monetizationRoutes from "./routes/monetizationRoutes.js"

const REQUIRED_ENV_VARS = [
  { name: "GROQ_API_KEY", description: "Groq AI API Key for script generation" },
  { name: "PEXELS_API_KEY", description: "Pexels API Key for video footage" }
]

const OPTIONAL_ENV_VARS = [
  { name: "MONGO_URI", description: "MongoDB connection string" },
  { name: "YT_CLIENT_ID", description: "YouTube OAuth Client ID" },
  { name: "YT_CLIENT_SECRET", description: "YouTube OAuth Client Secret" },
  { name: "YT_REDIRECT_URI", description: "YouTube OAuth Redirect URI" },
  { name: "YOUTUBE_API_KEY", description: "YouTube Data API Key" }
]

const validateEnvVars = () => {
  const missing = []
  const warnings = []
  
  for (const env of REQUIRED_ENV_VARS) {
    if (!process.env[env.name]) {
      missing.push(env)
    }
  }
  
  for (const env of OPTIONAL_ENV_VARS) {
    if (!process.env[env.name]) {
      warnings.push(env)
    }
  }
  
  if (missing.length > 0) {
    console.error("\n❌ Missing required environment variables:")
    missing.forEach(e => console.error(`   - ${e.name}: ${e.description}`))
    console.error("\nPlease set these in your .env file or environment.\n")
    return false
  }
  
  if (warnings.length > 0) {
    console.warn("\n⚠️  Optional environment variables not set:")
    warnings.forEach(e => console.warn(`   - ${e.name}: ${e.description}`))
    console.warn("Some features may be limited.\n")
  } else {
    console.log("✓ All optional environment variables configured")
  }
  
  return true
}

const app = express()

app.use(express.json())

const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
  process.env.FRONTEND_URL,
  'https://autotube.vercel.app'
].filter(Boolean)

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true)
    } else {
      callback(new Error('Not allowed by CORS'))
    }
  },
  credentials: true
}))

// Connect to database before starting the server
try {
  await connectDB()
  console.log("✓ Database connected")
} catch (error) {
  console.error("Failed to connect to database:", error.message)
  process.exit(1)
}

// Validate required environment variables
if (!validateEnvVars()) {
  process.exit(1)
}

// Routes
app.use("/api/trends", trendRoutes)
app.use("/api/voice", voiceRoutes)
app.use("/api/video", videoRoutes)
app.use("/api/render", renderRoutes)
app.use("/api/pipeline", pipelineRoutes)
app.use("/api/youtube", youtubeRoutes)
app.use("/api/analytics", analyticsRoutes)
app.use("/api/niche", nicheRoutes)
app.use("/api/assets", assetRoutes)
app.use("/api/script", scriptRoutes)
app.use("/api/monetization", monetizationRoutes)

app.get("/", (req, res) => {
  res.send("AutoTube API Running 🚀")
})

// Global error-handling middleware — catches all errors passed via next(error)
app.use((err, req, res, next) => {
  console.error(`[ERROR] ${new Date().toISOString()} -`, err.message)

  const statusCode = err.statusCode || 500
  res.status(statusCode).json({
    success: false,
    message: err.message || "Internal Server Error",
    // Only expose stack traces in development
    ...(process.env.NODE_ENV === "development" && { stack: err.stack })
  })
})

// Start scheduler AFTER DB is connected and app is ready
startScheduler()

const PORT = process.env.PORT || 5000
app.listen(PORT, () =>
  console.log(`Server running on port ${PORT}`)
)