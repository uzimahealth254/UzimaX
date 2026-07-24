/**
 * API origin for browser calls.
 * - DEV: localhost:8787 unless VITE_API_URL is set
 * - PROD: same origin ('' → /api/v1/...) so Render single-service works even if
 *   VITE_API_URL was missing at build time (avoids baking localhost into the bundle)
 */
export function getApiBaseUrl(): string {
  const raw = import.meta.env.VITE_API_URL;
  if (typeof raw === 'string' && raw.trim()) {
    return raw.trim().replace(/\/$/, '');
  }
  if (import.meta.env.DEV) return 'http://localhost:8787';
  return '';
}
