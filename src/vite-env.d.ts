/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** API-ի հասցեն, եթե backend-ը տեղադրված է առանձին դոմենում (ըստ նախնականի՝ /api/v1)։ */
  readonly VITE_API_URL?: string
  /** Կայքի ենթաթղթապանակը (ըստ նախնականի՝ /)։ */
  readonly VITE_BASE_PATH?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
