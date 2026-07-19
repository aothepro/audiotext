import wavefile from 'wavefile';
import ffmpegStatic from 'ffmpeg-static';
import { spawn } from 'node:child_process';

// ffmpeg-static is CJS; NodeNext default-import typing can widen incorrectly.
const ffmpegPath = ffmpegStatic as unknown as string | null;

/**
 * Convert .oga / .ogg (or any ffmpeg-readable audio) to 16 kHz mono PCM WAV.
 */
export function convertToWav(inputPath: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    if (!ffmpegPath) {
      reject(new Error('ffmpeg-static binary not found'));
      return;
    }

    const chunks: Buffer[] = [];
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
    proc.stdout.on('data', (chunk: Buffer) => chunks.push(chunk));
    proc.stderr.on('data', (chunk: Buffer) => {
      stderr += chunk.toString();
    });
    proc.on('error', reject);
    proc.on('close', (code: number | null) => {
      if (code !== 0) {
        reject(new Error(`ffmpeg failed (exit ${code}):\n${stderr}`));
        return;
      }
      resolve(Buffer.concat(chunks));
    });
  });
}

export function loadAudioAsFloat32(wavBuffer: Buffer): Float32Array {
  const wav = new wavefile.WaveFile(wavBuffer);
  wav.toBitDepth('32f');
  wav.toSampleRate(16000);

  // wavefile typings always declare Float64Array; runtime matches the OutputObject ctor.
  let audioData = wav.getSamples(false, Float32Array) as unknown as Float32Array | Float32Array[];

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
