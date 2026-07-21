/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_NOTIFY_EMAIL_ENABLED?: string;
  readonly VITE_ENABLE_WALLET?: string;
  readonly VITE_ENABLE_ENGINE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
