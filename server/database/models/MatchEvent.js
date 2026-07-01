import mongoose from "mongoose"

const matchEventSchema = new mongoose.Schema({
  matchId: { type: String, unique: true },
  team1: String,
  team2: String,
  score1: { type: Number, default: 0 },
  score2: { type: Number, default: 0 },
  status: { type: String, enum: ["scheduled", "live", "finished"] },
  kickoffTime: Date,
  finishedTime: Date,
  stage: { type: String, enum: ["group", "round16", "quarter", "semi", "final"] },
  stats: {
    possession: [Number, Number],
    shotsOnTarget: [Number, Number],
    corners: [Number, Number],
    fouls: [Number, Number]
  },
  goals: [{ player: String, minute: Number, team: { type: Number, enum: [1, 2] } }],
  processedContent: [{ contentType: { type: String, enum: ["short", "long"] }, videoId: String, publishedAt: Date }]
}, { timestamps: true })

matchEventSchema.index({ status: 1, kickoffTime: 1 })
matchEventSchema.index({ kickoffTime: 1 })
matchEventSchema.index({ finishedTime: -1 })
matchEventSchema.index({ stage: 1 })

const MatchEvent = mongoose.model("MatchEvent", matchEventSchema)

export default MatchEvent
