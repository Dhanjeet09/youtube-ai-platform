import mongoose from "mongoose"

const topicHistorySchema = new mongoose.Schema(
  {
    topic: {
      type: String,
      unique: true,
      required: true,
      index: true,
    },
    usedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    jobId: {
      type: String,
      required: true,
    },
    category: {
      type: String,
      default: "general",
      index: true,
    },
    success: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
)

// ── Compound index: find recent topics, filter by category + success ─
topicHistorySchema.index({ category: 1, usedAt: -1 })
topicHistorySchema.index({ success: 1, usedAt: -1 })

const TopicHistory = mongoose.model("TopicHistory", topicHistorySchema)

export default TopicHistory
