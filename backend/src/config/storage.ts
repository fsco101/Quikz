import 'dotenv/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export function uploadsDirectory(env: NodeJS.ProcessEnv = process.env): string {
  const configured = env.UPLOAD_DIR?.trim();
  if (env.NODE_ENV === 'production' && !configured) {
    throw new Error('UPLOAD_DIR is required in production. Use persistent storage for lesson files.');
  }
  if (configured && !path.isAbsolute(configured)) {
    throw new Error('UPLOAD_DIR must be an absolute filesystem path.');
  }
  return configured || fileURLToPath(new URL('../../uploads/', import.meta.url));
}

export const UPLOADS_DIR = uploadsDirectory();
