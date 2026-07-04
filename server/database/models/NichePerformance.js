import mongoose from "mongoose"

const nichePerformanceSchema = new mongoose.Schema({
  niche: { type: String, required: true, unique: true },
  videoCount: { type: Number, default: 0 },
  totalViews: { type: Number, default: 0 },
  totalLikes: { type: Number, default: 0 },
  totalComments: { type: Number, default: 0 },
  // Array of { videoId, timestamp } tracking videos registered under this niche
  videos: [{
    videoId: { type: String, required: true },
    timestamp: { type: Date, default: Date.now }
  }],
  // Aggregate viral score accumulator (summed, not averaged)
  totalViralScore: { type: Number, default: 0 },
  averageViralScore: { type: Number, default: 0 }
}, { timestamps: true })

const NichePerformance = mongoose.model("NichePerformance", nichePerformanceSchema)

export default NichePerformance
