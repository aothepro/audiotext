# AGENTS.md

Guidance for AI agents working on **audiotext** — a Node.js service that converts audio (OGG/OGA and other common formats) to text using Whisper via `@huggingface/transformers`.

## Stack

- **Runtime:** Node.js `24.x` (see `package.json` `engines` and `.nvmrc`)
- **Language:** TypeScript (strict), compiled with `tsc` to `dist/`
- **Module system:** ESM (`"type": "module"`) — use `import`/`export`, not `require`
- **Dev runner:** `tsx` for `npm run dev` and `npm run transcribe`
- **HTTP:** Express 5
- **Uploads:** Multer (disk storage under `os.tmpdir()`)
- **Audio decode:** `ffmpeg-static` → 16 kHz mono PCM WAV, then `wavefile` → `Float32Array`
- **ASR:** `@huggingface/transformers` pipeline `automatic-speech-recognition` with `onnx-community/whisper-large-v3-turbo` (`dtype: 'q4'`)

## Layout

```
server.ts           # Express API: GET /health, POST /transcribe
transcribe.ts       # CLI entry
lib/audio.ts        # ffmpeg convert + float32 load
lib/transcriber.ts  # Whisper pipeline + HF cache config
tsconfig.json       # NodeNext ESM, strict, outDir dist/
dist/               # Build output (gitignored)
```

Keep transcription logic in `lib/`. Keep the HTTP layer thin in `server.ts`.

Use `.js` extensions in relative imports (TypeScript NodeNext convention), e.g. `from './lib/transcriber.js'`.

## Commands

```bash
npm install
npm run typecheck  # tsc --noEmit
npm run build      # emit to dist/
npm run dev        # API via tsx watch (hot reload, default PORT 4000)
npm start          # builds then runs dist/server.js
npm run transcribe -- path/to/audio.oga
```

Example API call:

```bash
curl -F "audio=@voice.oga" http://localhost:4000/transcribe
```

## Conventions

- Prefer small, focused changes. Match existing style: typed JS-like TypeScript, async/await, minimal abstraction.
- Do not add a frontend framework or unnecessary tooling unless explicitly requested.
- Uploaded files and HF model cache must use writable temp dirs (`os.tmpdir()`). Never write under `node_modules` — that fails on Vercel/Lambda.
- Clean up temp upload files in `finally` (see `server.ts`).
- Supported upload extensions live in the Multer `fileFilter` in `server.ts`; keep CLI and API behavior consistent when adding formats.
- Max upload size is 25 MB unless requirements change.
- Prefer real types over `any`. Narrow CJS interop (e.g. `ffmpeg-static`) with small casts when typings are wrong.

## Deployment notes (Vercel / serverless)

- Build with `npm run build`; run `node dist/server.js` (or set Vercel build/start accordingly).
- Set `env.cacheDir` to a path under `os.tmpdir()` before calling `pipeline` (already done in `lib/transcriber.ts`).
- First request downloads the model into `/tmp` — expect slow cold starts and high memory use.
- `ffmpeg-static` and ONNX native binaries can be fragile on serverless Linux; prefer diagnosing platform/binary issues before rewriting the API.
- Node version for Vercel comes from `package.json` `engines.node` (`24.x`). Keep `.nvmrc` in sync.

## Do not

- Commit secrets, large model weights, generated `.wav` / cache artifacts, or `dist/`.
- Expand scope beyond the asked change (no drive-by refactors or extra markdown docs unless requested).
- Switch Whisper models or dtype without being asked — it affects latency, memory, and quality.
