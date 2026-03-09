import mongoose from "mongoose"

const scriptSchema = new mongoose.Schema(
 {
  topic: {
   type: String,
   required: true
  },

  content: {
   type: String,
   required: true
  },

  source: {
   type: String,
   default: "google-trends"
  }
 },
 { timestamps: true }
)

const Script = mongoose.model("Script", scriptSchema)

export default Script