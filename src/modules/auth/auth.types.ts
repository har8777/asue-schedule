import type { UserRole } from './auth.constants'

export interface AuthUser {
  id: string
  username: string
  displayName: string
  role: UserRole
  facultyId: string | null
}

export interface AuthSession {
  token: string
  expiresAt: string
  user: AuthUser
}

export interface LoginPayload {
  username: string
  password: string
}

export interface ChangePasswordPayload {
  currentPassword: string
  newPassword: string
}
