import { localStore, STORAGE_KEYS } from '../common/storage/local-storage'
import type { AuthSession } from './auth.types'

/** Սեսիայի պահպանում բրաուզերում (միայն token-ը և օգտատիրոջ հիմնական տվյալները)։ */
export const authStorage = {
  read(): AuthSession | null {
    const session = localStore.get<AuthSession | null>(STORAGE_KEYS.AUTH_SESSION, null)
    if (!session?.token || !session.expiresAt) return null
    if (new Date(session.expiresAt).getTime() <= Date.now()) {
      localStore.remove(STORAGE_KEYS.AUTH_SESSION)
      return null
    }
    return session
  },

  write(session: AuthSession): void {
    localStore.set(STORAGE_KEYS.AUTH_SESSION, session)
  },

  clear(): void {
    localStore.remove(STORAGE_KEYS.AUTH_SESSION)
  },
}
