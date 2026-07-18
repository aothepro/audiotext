import { pipeline } from '@huggingface/transformers';
import fs from 'fs';
import { convertToWav, loadAudioAsFloat32 } from './audio.js';

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
