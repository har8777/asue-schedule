/** localStorage-ի անվտանգ փաթաթում (private ռեժիմում կամ արգելափակման դեպքում չի ընկնում)։ */
export const localStore = {
  get<T>(key: string, fallback: T): T {
    try {
      const raw = window.localStorage.getItem(key)
      return raw === null ? fallback : (JSON.parse(raw) as T)
    } catch {
      return fallback
    }
  },

  set(key: string, value: unknown): void {
    try {
      window.localStorage.setItem(key, JSON.stringify(value))
    } catch {
      // Պահոցը հասանելի չէ. արժեքը կմնա միայն ընթացիկ սեսիայում
    }
  },

  remove(key: string): void {
    try {
      window.localStorage.removeItem(key)
    } catch {
      // Անտեսում ենք
    }
  },
}

export const STORAGE_KEYS = {
  AUTH_SESSION: 'asue.auth-session',
  THEME: 'asue.theme',
  LAST_COHORT: 'asue.last-cohort',
  STREAM_PREFIX: 'asue.stream.',
  SCHEDULE_VIEW: 'asue.schedule-view',
  CHANGE_LOG_SEEN: 'asue.change-log-seen',
} as const
