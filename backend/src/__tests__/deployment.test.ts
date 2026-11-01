import { describe, expect, it } from 'vitest';
import express from 'express';
import cors from 'cors';
import request from 'supertest';
import path from 'node:path';
import { corsOptions, CorsOriginError } from '../config/cors.js';
import { uploadsDirectory } from '../config/storage.js';
import { jwtSecret } from '../config/auth.js';

describe('Production deployment configuration', () => {
  it('allows only configured frontend origins and supports authenticated multipart preflights', async () => {
    const app = express();
    app.use(cors(corsOptions({ NODE_ENV: 'production', CORS_ORIGINS: 'https://quikz.vercel.app/,https://learn.example.com' })));
    app.get('/resource', (_req, res) => res.json({ ok: true }));
    app.use((error: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
      res.status(error instanceof CorsOriginError ? 403 : 500).json({ message: error.message });
    });
    const preflight = await request(app).options('/resource')
      .set('Origin', 'https://quikz.vercel.app')
      .set('Access-Control-Request-Method', 'POST')
      .set('Access-Control-Request-Headers', 'authorization,content-type');
    expect(preflight.status).toBe(204);
    expect(preflight.headers['access-control-allow-origin']).toBe('https://quikz.vercel.app');
    expect(preflight.headers['access-control-allow-headers']).toMatch(/Authorization/);
    expect(preflight.headers.vary).toContain('Origin');
    expect((await request(app).get('/resource').set('Origin', 'https://learn.example.com')).status).toBe(200);
    const denied = await request(app).get('/resource').set('Origin', 'https://quikz.vercel.app.attacker.test');
    expect(denied.status).toBe(403);
    expect(denied.headers['access-control-allow-origin']).toBeUndefined();
    expect((await request(app).get('/resource')).status).toBe(200);
  });

  it('fails fast for absent or invalid production origins instead of allowing all sites', () => {
    for (const origin of ['', '*', 'https://example.com/api', 'https://user:password@example.com', 'https://example.com?foo=bar', 'https://example.com,']) {
      expect(() => corsOptions({ NODE_ENV: 'production', CORS_ORIGINS: origin })).toThrow(/CORS_ORIGINS/);
    }
  });

  it('requires an explicit absolute upload directory in production and shares a stable local default', () => {
    expect(() => uploadsDirectory({ NODE_ENV: 'production' })).toThrow(/UPLOAD_DIR/);
    expect(() => uploadsDirectory({ NODE_ENV: 'production', UPLOAD_DIR: './uploads' })).toThrow(/absolute/);
    const persistent = path.resolve('persistent-test-volume', 'uploads');
    expect(uploadsDirectory({ NODE_ENV: 'production', UPLOAD_DIR: persistent })).toBe(persistent);
    expect(uploadsDirectory({ NODE_ENV: 'development' })).toBe(path.resolve('uploads') + path.sep);
  });

  it('requires a strong stable signing secret in production', () => {
    for (const value of [undefined, '', ' ', 'short-secret']) {
      expect(() => jwtSecret({ NODE_ENV: 'production', JWT_SECRET: value })).toThrow(/JWT_SECRET/);
    }
    const secret = 'deployment-test-only-secret-000000000000';
    expect(jwtSecret({ NODE_ENV: 'production', JWT_SECRET: secret })).toBe(secret);
  });
});
