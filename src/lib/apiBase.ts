/**
 * API origin for browser calls.
 * - DEV: localhost:8787 unless VITE_API_URL is a non-local host
 * - PROD: same origin ('' → /api/v1/...), so ioux.africa, staging, and
 *   uzimax.onrender.com all talk to the API on the host that served the page.
 *   A split static portal sets VITE_API_MODE=remote and VITE_API_URL.
 *   Localhost is never baked into a production bundle.
 */
export function getApiBaseUrl(): string {
  const raw = import.meta.env.VITE_API_URL;
  const trimmed = typeof raw === 'string' ? raw.trim().replace(/\/$/, '') : '';
  const isLocal = /localhost|127\.0\.0\.1/i.test(trimmed);
  const remote = import.meta.env.VITE_API_MODE === 'remote';

  if (import.meta.env.DEV) {
    if (trimmed) return trimmed;
    return 'http://localhost:8787';
  }
  if (remote && trimmed && !isLocal) return trimmed;
  return '';
}
