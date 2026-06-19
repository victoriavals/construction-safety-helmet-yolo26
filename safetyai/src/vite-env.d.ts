/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** URL backend FastAPI (Hugging Face), mis. https://user-space.hf.space */
  readonly VITE_API_BASE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

interface Window {
  /** Override runtime URL backend (di-set oleh public/config.js). */
  API_BASE?: string;
}
