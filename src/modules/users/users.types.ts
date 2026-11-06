import type { UserRole } from '../auth/auth.constants'

export interface User {
  id: string
  username: string
  displayName: string
  role: UserRole
  facultyId: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface CreateUserPayload {
  username: string
  displayName: string
  password: string
  role: UserRole
  facultyId: string | null
}

export interface UpdateUserPayload {
  displayName?: string
  password?: string
  role?: UserRole
  facultyId?: string | null
  isActive?: boolean
}
