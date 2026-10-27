// Vite substitutes this public origin at build time. Local development uses its proxy.
const API_ORIGIN = (import.meta.env.VITE_API_URL || '').trim().replace(/\/+$/, '');

export function apiUrl(path: string): string {
  if (!path.startsWith('/api/')) throw new Error('Expected a relative Quikz API path.');
  return `${API_ORIGIN}${path}`;
}
