import axios from "axios";
import fs from "fs";
import path from "path";

export const generateVoice = async (text) => {
  if (!process.env.ELEVENLABS_API_KEY || typeof process.env.ELEVENLABS_API_KEY !== 'string') {
    throw new Error("ELEVENLABS_API_KEY is not set");
  }

  const voiceId = process.env.ELEVENLABS_VOICE_ID || "JBFqnCBsd6RMkjVDRZzb";
  const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`;

  let response;
  try {
    response = await axios({
      method: "POST",
      url,
      headers: {
        "xi-api-key": process.env.ELEVENLABS_API_KEY,
        "Content-Type": "application/json",
      },
      data: {
        text,
        model_id: "eleven_multilingual_v2",
      },
      responseType: "arraybuffer",
      timeout: 30000, // 30 seconds timeout
    });
  } catch (error) {
    console.error("Error calling ElevenLabs API:", error.message);
    if (error.response) {
      console.error("Response status:", error.response.status);
      console.error("Response data:", error.response.data);
    }
    throw new Error("Failed to generate voice from ElevenLabs API");
  }

  const audioDir = "assets/generated/audio";

  if (!fs.existsSync(audioDir)) {
    fs.mkdirSync(audioDir, { recursive: true });
  }

  const fileName = `voice-${Date.now()}-${Math.floor(Math.random() * 1000)}.mp3`;
  const outputPath = path.join(audioDir, fileName);

  fs.writeFileSync(outputPath, response.data);

  return outputPath;
};
