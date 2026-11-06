import type { Database } from '../../core/database/database.ts'
import type { UserRole } from '../auth/auth.constants.ts'
import type { UserRecord } from './users.types.ts'

interface UserRow {
  id: string
  username: string
  display_name: string
  password_hash: string
  role: UserRole
  faculty_id: string | null
  is_active: number
  created_at: string
  updated_at: string
}

const toRecord = (row: UserRow): UserRecord => ({
  id: row.id,
  username: row.username,
  displayName: row.display_name,
  passwordHash: row.password_hash,
  role: row.role,
  facultyId: row.faculty_id,
  isActive: row.is_active === 1,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
})

export class UsersRepository {
  private readonly db: Database

  constructor(db: Database) {
    this.db = db
  }

  findAll(): UserRecord[] {
    return this.db.all<UserRow>('SELECT * FROM users ORDER BY role DESC, username').map(toRecord)
  }

  findById(id: string): UserRecord | null {
    const row = this.db.get<UserRow>('SELECT * FROM users WHERE id = ?', id)
    return row ? toRecord(row) : null
  }

  findByUsername(username: string): UserRecord | null {
    const row = this.db.get<UserRow>('SELECT * FROM users WHERE username = ?', username)
    return row ? toRecord(row) : null
  }

  count(): number {
    return this.db.get<{ total: number }>('SELECT COUNT(*) AS total FROM users')?.total ?? 0
  }

  countActiveSuperAdmins(): number {
    return (
      this.db.get<{ total: number }>("SELECT COUNT(*) AS total FROM users WHERE role = 'SUPER_ADMIN' AND is_active = 1")
        ?.total ?? 0
    )
  }

  insert(user: UserRecord): void {
    this.db.run(
      `INSERT INTO users (id, username, display_name, password_hash, role, faculty_id, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      user.id,
      user.username,
      user.displayName,
      user.passwordHash,
      user.role,
      user.facultyId,
      user.isActive ? 1 : 0,
      user.createdAt,
      user.updatedAt,
    )
  }

  update(user: UserRecord): void {
    this.db.run(
      `UPDATE users SET display_name = ?, password_hash = ?, role = ?, faculty_id = ?, is_active = ?, updated_at = ?
       WHERE id = ?`,
      user.displayName,
      user.passwordHash,
      user.role,
      user.facultyId,
      user.isActive ? 1 : 0,
      user.updatedAt,
      user.id,
    )
  }

  delete(id: string): void {
    this.db.run('DELETE FROM users WHERE id = ?', id)
  }
}
