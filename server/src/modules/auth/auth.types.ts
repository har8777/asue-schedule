import type { UserRole } from './auth.constants.ts'

/** Մուտք գործած օգտատերը, որը guard-երը կցում են հարցմանը։ */
export interface AuthUser {
  id: string
  username: string
  displayName: string
  role: UserRole
  facultyId: string | null
}

export interface TokenPayload {
  sub: string
  role: UserRole
}

export interface LoginResult {
  token: string
  expiresAt: string
  user: AuthUser
}
