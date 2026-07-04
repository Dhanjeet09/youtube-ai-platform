/**
 * Poem Pipeline Configuration
 * Centralizes all magic numbers and tunable settings.
 */

export const PIPELINE_CONFIG = {
  /** Daily batch size — how many videos the scheduler creates per day */
  dailyBatchSize: 3,

  /** TTS voice configuration for Hindi poem narration */
  tts: {
    voice: "hi-IN-SwaraNeural",
    rate: "+0%",
    pitch: "+0Hz",
    language: "hinglish",
  },

  /** Video render settings */
  video: {
    width: 1080,
    height: 1920,
    fps: 30,
    orientation: "portrait",
    audioBitrate: "128k",
  },

  /** Retry defaults for pipeline steps */
  retry: {
    maxRetries: 2,
    baseDelay: 1000,
  },

  /** YouTube upload defaults */
  youtube: {
    categoryId: "24", // Entertainment
    privacyStatus: "public",
    tags: ["Hindi Shayari", "Poetry", "Motivation", "Shorts", "Hindi Poem"],
  },

  /** Thumbnail generation defaults */
  thumbnail: {
    timestamp: "00:01",
  },
}
