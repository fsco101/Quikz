import 'dotenv/config';
import { randomBytes } from 'node:crypto';
export function jwtSecret(env: NodeJS.ProcessEnv = process.env): string {
  const secret = env.JWT_SECRET?.trim();
  if (env.NODE_ENV === 'production' && (!secret || secret.length < 32)) {
    throw new Error('JWT_SECRET must contain at least 32 characters in production.');
  }
  return secret || randomBytes(48).toString('hex');
}
export const JWT_SECRET = jwtSecret();
