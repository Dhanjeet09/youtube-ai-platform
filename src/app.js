import express from "express"
import dotenv from "dotenv"

import connectDB from "./config/db.js"

import trendRoutes from "./routes/trendRoutes.js"

dotenv.config()

const app = express()

app.use(express.json())

try {
  await connectDB()
} catch (error) {
  console.error("Failed to connect to database:", error.message)
  process.exit(1)
}
app.use("/api/trends", trendRoutes)

app.get("/", (req, res) => {
 res.send("AI YouTube Automation API Running")
})

const PORT = process.env.PORT || 5000
app.listen(PORT, () =>
 console.log(`Server running on port ${PORT}`)
)