/**
 * API origin for browser calls.
 * - DEV: localhost:8787 unless VITE_API_URL is set
 * - PROD: same origin ('' → /api/v1/...) so a single Render service works.
 *   Never bake localhost into a production bundle (local .env or bad Render env).
 */
export function getApiBaseUrl(): string {
  const raw = import.meta.env.VITE_API_URL;
  const trimmed = typeof raw === 'string' ? raw.trim().replace(/\/$/, '') : '';
  const isLocal = /localhost|127\.0\.0\.1/i.test(trimmed);

  if (trimmed && !(import.meta.env.PROD && isLocal)) {
    return trimmed;
  }
  if (import.meta.env.DEV) return 'http://localhost:8787';
  return '';
}
