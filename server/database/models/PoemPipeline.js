import mongoose from "mongoose"

const sceneSchema = new mongoose.Schema(
  {
    sceneNumber: { type: Number, required: true },
    text: { type: String, required: true },
    duration: { type: Number, required: true },
    imageUrl: { type: String, default: null },
    imageKitFileId: { type: String, default: null },
  },
  { _id: false }
)

const qualityCheckItemSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    passed: { type: Boolean, required: true },
    message: { type: String, default: "" },
  },
  { _id: false }
)

const poemPipelineSchema = new mongoose.Schema(
  {
    jobId: {
      type: String,
      unique: true,
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["pending", "processing", "completed", "failed", "dry-run"],
      default: "pending",
      index: true,
    },
    topic: {
      type: String,
      required: true,
      index: true,
    },
    poem: {
      title: { type: String, default: "" },
      lines: { type: [String], default: [] },
      lineCount: { type: Number, default: 0 },
      language: { type: String, default: "hindi", immutable: true },
    },
    scenes: {
      type: [sceneSchema],
      default: [],
    },
    audio: {
      ttsFile: { type: String, default: null },
      duration: { type: Number, default: 0 },
      voice: { type: String, default: null },
    },
    backgroundMusic: {
      filename: { type: String, default: null },
      path: { type: String, default: null },
    },
    subtitles: {
      srtContent: { type: String, default: null },
      imageKitUrl: { type: String, default: null },
    },
    video: {
      finalVideoUrl: { type: String, default: null },
      thumbnailUrl: { type: String, default: null },
      duration: { type: Number, default: 0 },
      resolution: { type: String, default: "1080x1920" },
    },
    seo: {
      title: { type: String, default: "" },
      description: { type: String, default: "" },
      tags: { type: [String], default: [] },
      hashtags: { type: [String], default: [] },
    },
    youtube: {
      videoId: { type: String, default: null },
      videoUrl: { type: String, default: null },
      uploadedAt: { type: Date, default: null },
      privacyStatus: {
        type: String,
        enum: ["public", "private", "unlisted"],
        default: "private",
      },
    },
    qualityCheck: {
      passed: { type: Boolean, default: false },
      checks: { type: [qualityCheckItemSchema], default: [] },
      checkedAt: { type: Date, default: null },
    },
    stats: {
      startedAt: { type: Date, default: null },
      completedAt: { type: Date, default: null },
      duration: { type: Number, default: 0 },
      retryCount: { type: Number, default: 0 },
      lastError: { type: String, default: null },
    },
    config: {
      dryRun: { type: Boolean, default: false },
      quality: { type: String, enum: ["low", "medium", "high"], default: "medium" },
      autoUpload: { type: Boolean, default: true },
    },
  },
  { timestamps: true }
)

// ── Compound indexes for common query patterns ──────────────────────
poemPipelineSchema.index({ status: 1, createdAt: -1 })
poemPipelineSchema.index({ topic: 1, createdAt: -1 })
poemPipelineSchema.index({ status: 1, "stats.startedAt": 1 })
poemPipelineSchema.index({ "youtube.uploadedAt": -1 })

const PoemPipeline = mongoose.model("PoemPipeline", poemPipelineSchema)

export default PoemPipeline
