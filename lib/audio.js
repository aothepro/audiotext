import wavefile from 'wavefile';
import ffmpegPath from 'ffmpeg-static';
import { spawn } from 'child_process';

/**
 * Convert .oga / .ogg (or any ffmpeg-readable audio) to 16 kHz mono PCM WAV.
 */
export function convertToWav(inputPath) {
  return new Promise((resolve, reject) => {
    if (!ffmpegPath) {
      reject(new Error('ffmpeg-static binary not found'));
      return;
    }

    const chunks = [];
    const proc = spawn(
      ffmpegPath,
      [
        '-i', inputPath,
        '-ar', '16000',
        '-ac', '1',
        '-f', 'wav',
        '-acodec', 'pcm_s16le',
        'pipe:1',
      ],
      { stdio: ['ignore', 'pipe', 'pipe'] }
    );

    let stderr = '';
    proc.stdout.on('data', (chunk) => chunks.push(chunk));
    proc.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });
    proc.on('error', reject);
    proc.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`ffmpeg failed (exit ${code}):\n${stderr}`));
        return;
      }
      resolve(Buffer.concat(chunks));
    });
  });
}

export function loadAudioAsFloat32(wavBuffer) {
  const wav = new wavefile.WaveFile(wavBuffer);
  wav.toBitDepth('32f');
  wav.toSampleRate(16000);
  let audioData = wav.getSamples(false, Float32Array);

  if (Array.isArray(audioData)) {
    if (audioData.length > 1) {
      const scale = Math.SQRT2;
      for (let i = 0; i < audioData[0].length; i++) {
        audioData[0][i] = (scale * (audioData[0][i] + audioData[1][i])) / 2;
      }
    }
    audioData = audioData[0];
  }

  return audioData;
}
