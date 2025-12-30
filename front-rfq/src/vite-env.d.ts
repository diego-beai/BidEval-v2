/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_N8N_WEBHOOK_URL: string;
  readonly VITE_POLLING_INTERVAL?: string;
  readonly VITE_REQUEST_TIMEOUT?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
