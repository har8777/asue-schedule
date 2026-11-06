import type { UserRole } from '../auth/auth.constants.ts'

export interface UserRecord {
  id: string
  username: string
  displayName: string
  passwordHash: string
  role: UserRole
  facultyId: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export type PublicUser = Omit<UserRecord, 'passwordHash'>

export interface CreateUserDto {
  username: string
  displayName: string
  password: string
  role: UserRole
  facultyId: string | null
}

export interface UpdateUserDto {
  displayName?: string
  password?: string
  role?: UserRole
  facultyId?: string | null
  isActive?: boolean
}
