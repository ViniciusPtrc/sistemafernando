import multer from 'multer';
import path from 'node:path';
import { env } from '../config/env';
import { HttpError } from '../utils/http';

const ALLOWED_EXT = new Set(['.xlsx', '.xls', '.csv']);
const ALLOWED_MIME = new Set([
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // xlsx
  'application/vnd.ms-excel', // xls
  'text/csv',
  'application/csv',
  'text/plain', // alguns navegadores enviam csv assim
  'application/octet-stream', // .xls antigo / fallback
]);

const storage = multer.memoryStorage(); // §27: não persiste o arquivo em disco

export const uploadSpreadsheet = multer({
  storage,
  limits: { fileSize: env.maxUploadBytes, files: 1 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    if (!ALLOWED_EXT.has(ext)) {
      return cb(new HttpError(400, `Extensão não permitida: "${ext || 'sem extensão'}". Use .xlsx, .xls ou .csv.`));
    }
    if (file.mimetype && !ALLOWED_MIME.has(file.mimetype)) {
      return cb(new HttpError(400, `Tipo de arquivo não permitido (${file.mimetype}).`));
    }
    cb(null, true);
  },
}).single('file');
