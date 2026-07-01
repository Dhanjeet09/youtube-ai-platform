import mongoose from "mongoose"

const contentTemplateSchema = new mongoose.Schema({
  name: { type: String, unique: true },
  type: { type: String, enum: ["short", "long"] },
  category: { type: String, enum: [
    "match-result", "match-prediction", "player-fact",
    "surprise-stat", "top-moments", "tactical-analysis",
    "match-preview", "match-breakdown", "top-performers",
    "weekly-recap", "tournament-storylines", "debate"
  ]},
  orientation: { type: String, enum: ["portrait", "landscape"], default: "portrait" },
  maxWords: Number,
  promptTemplate: String,
  requiredVars: [String],
  defaultTags: [String],
  rpm: { type: Number, default: 5 }
}, { timestamps: true })

contentTemplateSchema.index({ category: 1 })
contentTemplateSchema.index({ type: 1 })
contentTemplateSchema.index({ type: 1, category: 1 })

const ContentTemplate = mongoose.model("ContentTemplate", contentTemplateSchema)

export default ContentTemplate
