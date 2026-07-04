import mongoose from "mongoose"

const scriptSchema = new mongoose.Schema(
  {
    topic: {
      type: String,
      required: true,
      index: true
    },
    content: {
      type: String,
      required: true
    },
    source: {
      type: String,
      default: "google-trends",
      index: true
    }
  },
  { timestamps: true }
)

scriptSchema.index({ topic: 1, createdAt: -1 })

const Script = mongoose.model("Script", scriptSchema)

export default Script
