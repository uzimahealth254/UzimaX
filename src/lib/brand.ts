/** Public product brand — IOU Exchange (ioux.africa) */
export const BRAND = {
  name: 'IOU Exchange',
  short: 'IOUX',
  domain: 'ioux.africa',
  /** Marketing site */
  url: 'https://www.ioux.africa',
  /** Authenticated portals */
  portalUrl: 'https://app.ioux.africa',
  /** Public API base (no trailing slash) */
  apiUrl: 'https://api.ioux.africa',
  supportEmail: 'hello@ioux.africa',
  privacyEmail: 'privacy@ioux.africa',
  legalEmail: 'legal@ioux.africa',
  fromEmail: 'IOU Exchange <no-reply@ioux.africa>',
  tagline: 'Working capital for pharmacy trade',
} as const;

/** Production CORS allow-list (comma-separated for env) */
export const LIVE_CORS_ORIGINS = [
  'https://www.ioux.africa',
  'https://ioux.africa',
  'https://app.ioux.africa',
].join(',');
