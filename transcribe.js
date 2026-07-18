import fs from 'fs';
import path from 'path';
import os from 'os';
import { transcribeFile } from './lib/transcriber.js';

async function main() {
  const inputPath = process.argv[2];

  if (!inputPath) {
    console.error('Usage: node transcribe.js <path-to-audio.oga>');
    console.error('Example: node transcribe.js voice_message.oga');
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
    console.error('Error:', err.message);
    process.exit(1);
  }
}

main();
