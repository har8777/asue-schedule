import type { Database } from '../../core/database/database.ts'

/** Key/value պահոց JSON արժեքներով։ */
export class SettingsRepository {
  private readonly db: Database

  constructor(db: Database) {
    this.db = db
  }

  get<T>(key: string): T | null {
    const row = this.db.get<{ value: string }>('SELECT value FROM settings WHERE key = ?', key)
    if (!row) return null
    try {
      return JSON.parse(row.value) as T
    } catch {
      return null
    }
  }

  set(key: string, value: unknown): void {
    this.db.run(
      'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
      key,
      JSON.stringify(value),
    )
  }
}
