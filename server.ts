import express, {
  type ErrorRequestHandler,
  type Request,
  type Response,
} from 'express';
import multer from 'multer';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { transcribeFile } from './lib/transcriber.js';

const app = express();
const PORT = Number(process.env.PORT) || 4000;
const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25 MB

const upload = multer({
  storage: multer.diskStorage({
    destination: os.tmpdir(),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname) || '.oga';
      cb(null, `upload-${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
    },
  }),
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (_req, file, cb) => {
    const allowed = ['.oga', '.ogg', '.wav', '.mp3', '.m4a', '.webm', '.opus'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (!ext || allowed.includes(ext)) {
      cb(null, true);
      return;
    }
    cb(new Error(`Unsupported audio format: ${ext}`));
  },
});

function cleanup(filePath: string | undefined): void {
  if (filePath && fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
}

app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok' });
});

app.post('/transcribe', upload.single('audio'), async (req: Request, res: Response) => {
  if (!req.file) {
    res.status(400).json({ error: 'Missing audio file. Send multipart/form-data with field "audio".' });
    return;
  }

  const filePath = req.file.path;

  try {
    const text = await transcribeFile(filePath);
    res.json({ text });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Transcription failed';
    console.error('Transcription error:', err);
    res.status(500).json({ error: message });
  } finally {
    cleanup(filePath);
  }
});

const errorHandler: ErrorRequestHandler = (err, _req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      res.status(413).json({ error: `File too large. Max size is ${MAX_FILE_SIZE / 1024 / 1024} MB.` });
      return;
    }
    res.status(400).json({ error: err.message });
    return;
  }
  if (err) {
    const message = err instanceof Error ? err.message : 'Request failed';
    res.status(400).json({ error: message });
    return;
  }
  next();
};

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Transcription API listening on http://localhost:${PORT}`);
  console.log(`POST /transcribe with form field "audio"`);
});
