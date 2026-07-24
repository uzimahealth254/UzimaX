/**
 * Cross-tenant isolation smoke (IOUX-COMPLETE-001 P0.3).
 * Same suite as `npm run test:cross-tenant`.
 *
 * Usage:
 *   API_URL=https://uzimax.onrender.com/api/v1 DEMO_PASSWORD=... npm run smoke:tenant-isolation
 */
export {};
await import('./security-cross-tenant.ts');
