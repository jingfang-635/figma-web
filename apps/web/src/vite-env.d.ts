/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_VISUAL_GATE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
