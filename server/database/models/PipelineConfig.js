import mongoose from "mongoose"

const pipelineConfigSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      unique: true,
      required: true,
      index: true,
    },
    value: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    description: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
)

const PipelineConfig = mongoose.model("PipelineConfig", pipelineConfigSchema)

export default PipelineConfig
