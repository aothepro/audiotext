import express from 'express';
import multer from 'multer';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { transcribeFile } from './lib/transcriber.js';

const app = express();
const PORT = process.env.PORT || 4000;
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

function cleanup(filePath) {
  if (filePath && fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
}

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.post('/transcribe', upload.single('audio'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Missing audio file. Send multipart/form-data with field "audio".' });
  }

  const filePath = req.file.path;

  try {
    const text = await transcribeFile(filePath);
    res.json({ text });
  } catch (err) {
    console.error('Transcription error:', err);
    res.status(500).json({ error: err.message || 'Transcription failed' });
  } finally {
    cleanup(filePath);
  }
});

app.use((err, _req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ error: `File too large. Max size is ${MAX_FILE_SIZE / 1024 / 1024} MB.` });
    }
    return res.status(400).json({ error: err.message });
  }
  if (err) {
    return res.status(400).json({ error: err.message });
  }
  next();
});

app.listen(PORT, () => {
  console.log(`Transcription API listening on http://localhost:${PORT}`);
  console.log(`POST /transcribe with form field "audio"`);
});
