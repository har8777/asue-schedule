export const HTTP_CLIENT_CONSTANTS = {
  /** API հասցեն։ Ըստ նախնականի նույն դոմենն է (սերվերը մատուցում է և՛ կայքը, և՛ API-ն)։ */
  BASE_URL: import.meta.env.VITE_API_URL || '/api/v1',
  TIMEOUT_MS: 20_000,
} as const
