export const USER_ROLES = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  ADMIN: 'ADMIN',
} as const

export type UserRole = (typeof USER_ROLES)[keyof typeof USER_ROLES]

export const USER_ROLE_VALUES: UserRole[] = [USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN]

export const AUTH_CONSTANTS = {
  LOGIN_ATTEMPTS_LIMIT: 10,
  LOGIN_WINDOW_MS: 15 * 60 * 1000,
  MIN_PASSWORD_LENGTH: 8,
  SETTINGS_SECRET_KEY: 'jwt_secret',
} as const
