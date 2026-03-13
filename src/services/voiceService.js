import axios from "axios";
import fs from "fs";
import path from "path";

export const generateVoice = async (text) => {
  const url =
    "https://api.elevenlabs.io/v1/text-to-speech/JBFqnCBsd6RMkjVDRZzb";

  const response = await axios({
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
  });

  const audioDir = "assets/generated/audio";

  if (!fs.existsSync(audioDir)) {
    fs.mkdirSync(audioDir, { recursive: true });
  }

  const outputPath = path.join(audioDir, "voice.mp3");

  fs.writeFileSync(outputPath, response.data);

  return outputPath;
};
