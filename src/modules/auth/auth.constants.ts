export const USER_ROLES = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  ADMIN: 'ADMIN',
} as const

export type UserRole = (typeof USER_ROLES)[keyof typeof USER_ROLES]

export const ADMIN_ROLES: UserRole[] = [USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN]

export const ROLE_LABELS: Record<UserRole, string> = {
  SUPER_ADMIN: 'Գլխավոր ադմինիստրատոր',
  ADMIN: 'Ֆակուլտետի ադմինիստրատոր',
}

export const AUTH_CONSTANTS = {
  MIN_PASSWORD_LENGTH: 8,
} as const
