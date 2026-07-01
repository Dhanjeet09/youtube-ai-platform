import mongoose from "mongoose"

const earningsRecordSchema = new mongoose.Schema({
  videoId: { type: String, required: true, unique: true },
  niche: { type: String, required: true },
  views: { type: Number, default: 0 },
  estimatedEarnings: { type: mongoose.Schema.Types.Mixed },
  lastUpdated: { type: Date, default: Date.now }
}, { timestamps: true })

earningsRecordSchema.index({ niche: 1 })
earningsRecordSchema.index({ lastUpdated: -1 })
// Support aggregation grouping by niche on estimated earnings
earningsRecordSchema.index({ niche: 1, "estimatedEarnings.adRevenue": -1 })

export default mongoose.model("EarningsRecord", earningsRecordSchema)
