import {
  env,
  pipeline,
  type AutomaticSpeechRecognitionPipeline,
} from "@huggingface/transformers";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { convertToWav, loadAudioAsFloat32 } from "./audio.js";

// Vercel/Lambda only allow writes under /tmp; default cache is under node_modules.
const cacheDir = path.join(os.tmpdir(), "huggingface-cache");
fs.mkdirSync(cacheDir, { recursive: true });
env.cacheDir = cacheDir;

let transcriberPromise: Promise<AutomaticSpeechRecognitionPipeline> | undefined;

function getTranscriber(): Promise<AutomaticSpeechRecognitionPipeline> {
  if (!transcriberPromise) {
    transcriberPromise = pipeline(
      "automatic-speech-recognition",
      "onnx-community/whisper-large-v3-turbo",
      { dtype: "q4" },
    );
  }
  return transcriberPromise;
}

export async function transcribeFile(inputPath: string): Promise<string> {
  if (!fs.existsSync(inputPath)) {
    throw new Error(`File not found: ${inputPath}`);
  }

  const wavBuffer = await convertToWav(inputPath);
  const audioData = loadAudioAsFloat32(wavBuffer);
  const transcriber = await getTranscriber();
  const result = await transcriber(audioData);
  const text = Array.isArray(result) ? result[0]?.text : result.text;

  return text?.trim() ?? "";
}
