import { env, pipeline } from '@huggingface/transformers';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { convertToWav, loadAudioAsFloat32 } from './audio.js';

// Vercel/Lambda only allow writes under /tmp; default cache is under node_modules.
const cacheDir = path.join(os.tmpdir(), 'huggingface-cache');
fs.mkdirSync(cacheDir, { recursive: true });
env.cacheDir = cacheDir;

let transcriberPromise;

function getTranscriber() {
  if (!transcriberPromise) {
    transcriberPromise = pipeline(
      'automatic-speech-recognition',
      'onnx-community/whisper-large-v3-turbo',
      { dtype: 'q4' }
    );
  }
  return transcriberPromise;
}

export async function transcribeFile(inputPath) {
  if (!fs.existsSync(inputPath)) {
    throw new Error(`File not found: ${inputPath}`);
  }

  const wavBuffer = await convertToWav(inputPath);
  const audioData = loadAudioAsFloat32(wavBuffer);
  const transcriber = await getTranscriber();
  const result = await transcriber(audioData);

  return result.text?.trim() ?? '';
}
