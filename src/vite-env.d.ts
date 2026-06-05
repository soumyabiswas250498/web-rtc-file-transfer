/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_CHUNK_SIZE_KB: string;
  readonly VITE_MAX_IN_FLIGHT_CHUNKS: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
