import 'dotenv/config';
import type { CorsOptions } from 'cors';

export class CorsOriginError extends Error {
  constructor() { super('This origin is not allowed to access the API.'); }
}

export function corsOptions(env: NodeJS.ProcessEnv = process.env): CorsOptions {
  const configured = env.CORS_ORIGINS?.trim();
  if (env.NODE_ENV === 'production' && !configured) {
    throw new Error('CORS_ORIGINS is required in production. Set the exact Vercel/custom frontend origins.');
  }
  const allowed = new Set((configured ? configured.split(',') : []).map(value => {
    const origin = value.trim();
    try {
      const parsed = new URL(origin);
      if (!['http:', 'https:'].includes(parsed.protocol) || parsed.username || parsed.password ||
        parsed.pathname !== '/' || parsed.search || parsed.hash) throw new Error();
      return parsed.origin;
    } catch {
      throw new Error('CORS_ORIGINS must contain comma-separated HTTP(S) origins without paths or wildcards.');
    }
  }));
  return {
    origin: (origin, callback) => {
      // Health probes and server-to-server requests have no browser Origin header.
      if (!origin || (!configured && env.NODE_ENV !== 'production') || allowed.has(origin)) callback(null, true);
      else callback(new CorsOriginError());
    },
    methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Authorization', 'Content-Type'],
    exposedHeaders: ['Content-Disposition'],
    maxAge: 600,
  };
}
