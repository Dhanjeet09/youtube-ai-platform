import mongoose from "mongoose"

const contentQueueSchema = new mongoose.Schema({
  jobId: { type: String, unique: true },
  type: { type: String, enum: ["short", "long"] },
  template: { type: mongoose.Schema.Types.ObjectId, ref: "ContentTemplate" },
  match: { type: mongoose.Schema.Types.ObjectId, ref: "MatchEvent" },
  vars: mongoose.Schema.Types.Mixed,
  status: { type: String, enum: ["queued", "processing", "completed", "failed"], default: "queued" },
  error: String,
  pipelineResult: mongoose.Schema.Types.Mixed,

  // ── ImageKit URLs (CDN-accessible) ────────────────────────────────
  // These store the public ImageKit URLs for assets produced by the pipeline.
  // pipelineResult holds local paths for backward compat.
  videoUrl: { type: String, default: null },
  thumbnailUrl: { type: String, default: null },
  audioUrl: { type: String, default: null },
  subtitleUrl: { type: String, default: null },

  startedAt: Date,
  completedAt: Date,
  priority: { type: Number, min: 1, max: 5, default: 3 }
}, { timestamps: true })

contentQueueSchema.index({ status: 1, priority: -1, createdAt: 1 })
contentQueueSchema.index({ match: 1, createdAt: 1 })
contentQueueSchema.index({ match: 1 })
contentQueueSchema.index({ status: 1 })

const ContentQueue = mongoose.model("ContentQueue", contentQueueSchema)

export default ContentQueue
