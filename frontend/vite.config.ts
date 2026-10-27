import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const apiOrigin = env.VITE_API_URL?.trim();
  if (env.VERCEL === '1' && !apiOrigin) throw new Error('Set VITE_API_URL to the public Render backend origin in Vercel before building.');
  if (apiOrigin) {
    let valid = false;
    try {
      const url = new URL(apiOrigin);
      valid = ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password &&
        url.pathname === '/' && !url.search && !url.hash && (env.VERCEL !== '1' || url.protocol === 'https:');
    } catch { /* Report a useful build error below. */ }
    if (!valid) throw new Error('VITE_API_URL must be a backend HTTP(S) origin without /api or other paths. Vercel requires HTTPS.');
  }
  return {
    plugins: [react()],
    server: {
      port: 3000,
      proxy: {
        '/api': {
          target: env.QUIKZ_API_TARGET || 'http://localhost:5000',
          changeOrigin: true
        },
        '/uploads': {
          target: env.QUIKZ_API_TARGET || 'http://localhost:5000',
          changeOrigin: true
        }
      }
    }
  };
});
