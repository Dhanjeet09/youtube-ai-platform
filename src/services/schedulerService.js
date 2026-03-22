import cron from "node-cron";
import fs from "fs";
import { createVideoPipeline } from "./pipelineService.js";
import { uploadVideoToYouTube } from "./youtubeService.js";

const runJob = async (label) => {
  try {
    console.log(`🚀 [${label}] Job started at`, new Date().toLocaleString());

    // 1️⃣ Generate full video pipeline
    const result = await createVideoPipeline();

    console.log("📦 Pipeline Result:", result);

    if (!result?.finalVideo) {
      throw new Error("Pipeline failed: videoPath missing");
    }

    const filePath = result?.finalVideo;

    // 2️⃣ Validate file exists
    if (!fs.existsSync(filePath)) {
      throw new Error(`Video file not found: ${filePath}`);
    }

    // 3️⃣ Metadata
    const title = result.title || "AI Tools You Must Try 🔥";
    const tags = Array.isArray(result.tags)
      ? result.tags
      : ["AI", "Tech", "Shorts"];

    // 4️⃣ Upload
    const upload = await uploadVideoToYouTube({
      filePath,
      title,
      description: title,
      tags,
    });

    console.log(`✅ [${label}] Uploaded Video ID:`, upload.id);

  } catch (error) {
    console.error(`❌ [${label}] Error:`, error.message);
  }
};

export const startScheduler = () => {

  // 🕙 10:00 AM
  cron.schedule("0 10 * * *", () => runJob("Morning Upload"));

  // 🕑 2:00 PM
  cron.schedule("0 14 * * *", () => runJob("Afternoon Upload"));

  // 🕕 6:00 PM
  cron.schedule("0 18 * * *", () => runJob("Evening Upload"));

  console.log("⏰ Scheduler started (3 uploads/day)");
};