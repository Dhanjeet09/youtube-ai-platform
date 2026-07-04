import mongoose from "mongoose"
import { log } from "../utils/logger.js"

/**
 * Connect to MongoDB with retry logic.
 * Uses MONGODB_URI env var (the canonical name used in render.yaml).
 * Falls back to MONGO_URI for backward compatibility.
 */
const connectDB = async () => {
  const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI

  if (!mongoUri || mongoUri.trim() === '') {
    throw new Error('MONGODB_URI environment variable is not defined or empty')
  }

  const maxRetries = 3
  for (let i = 0; i < maxRetries; i++) {
    try {
      await mongoose.connect(mongoUri, {
        maxPoolSize: 10,
        minPoolSize: 2,
        serverSelectionTimeoutMS: 5000,
        heartbeatFrequencyMS: 10000,
        socketTimeoutMS: 45000,
        connectTimeoutMS: 10000,
        retryWrites: true,
        retryReads: true,
        w: "majority",
        // 🔴 FIX: Enforce TLS for MongoDB connections. Without this,
        // connections may fall back to unencrypted TCP in some network
        // configurations, exposing credentials and data in transit.
        tls: true,
        tlsAllowInvalidCertificates: false,
      })
      log("INFO", "MongoDB connected", {
        poolSize: 10,
        retryWrites: true,
        retryReads: true
      })
      return
    } catch (error) {
      log("ERROR", `MongoDB connection attempt ${i + 1}/${maxRetries} failed: ${error.message}`)
      if (i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, 2000 * (i + 1)))
      } else {
        throw error
      }
    }
  }
}

mongoose.connection.on("connected", () => {
  log("INFO", "MongoDB connection established")
})

mongoose.connection.on("reconnected", () => {
  log("INFO", "MongoDB reconnected after disconnect")
})

mongoose.connection.on("disconnected", () => {
  log("WARN", "MongoDB disconnected - attempting reconnection")
})

mongoose.connection.on("error", (err) => {
  log("ERROR", "MongoDB connection error", { error: err.message })
})

export default connectDB
