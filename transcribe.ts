import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { transcribeFile } from './lib/transcriber.js';

async function main(): Promise<void> {
  const inputPath = process.argv[2];

  if (!inputPath) {
    console.error('Usage: node dist/transcribe.js <path-to-audio.oga>');
    console.error('Example: npm run transcribe -- voice_message.oga');
    process.exit(1);
  }

  const resolved = path.resolve(inputPath);

  try {
    console.log(`Transcribing "${resolved}"...`);
    const text = await transcribeFile(resolved);
    console.log('\n--- Transcription ---');
    console.log(text || '(empty)');
    console.log('---------------------\n');

    const outPath = path.join(
      path.dirname(resolved),
      `${path.basename(resolved, path.extname(resolved))}.txt`
    );
    fs.writeFileSync(outPath, text + os.EOL, 'utf8');
    console.log(`Saved to ${outPath}`);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('Error:', message);
    process.exit(1);
  }
}

void main();
