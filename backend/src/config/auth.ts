import 'dotenv/config';
import { randomBytes } from 'node:crypto';
if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) throw new Error('JWT_SECRET is required in production.');
export const JWT_SECRET = process.env.JWT_SECRET || randomBytes(48).toString('hex');
