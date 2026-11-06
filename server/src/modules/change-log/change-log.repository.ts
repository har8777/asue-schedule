import type { Database } from '../../core/database/database.ts'
import { createId, nowIso } from '../../core/utils/id.ts'
import type { LessonPart } from '../lessons/lessons.types.ts'
import type { ChangeLogAction, ChangeLogEntry, NewChangeLogEntry } from './change-log.types.ts'

interface ChangeLogRow {
  id: string
  created_at: string
  user_id: string | null
  user_name: string
  faculty_id: string | null
  cohort_id: string | null
  cohort_name: string
  action: ChangeLogAction
  day: string
  slot: string
  stream_id: string
  before_value: string | null
  after_value: string | null
}

const parseParts = (raw: string | null): LessonPart[] | null => (raw ? (JSON.parse(raw) as LessonPart[]) : null)

const toEntry = (row: ChangeLogRow): ChangeLogEntry => ({
  id: row.id,
  createdAt: row.created_at,
  userId: row.user_id,
  userName: row.user_name,
  facultyId: row.faculty_id,
  cohortId: row.cohort_id,
  cohortName: row.cohort_name,
  action: row.action,
  day: row.day,
  slot: row.slot,
  streamId: row.stream_id,
  before: parseParts(row.before_value),
  after: parseParts(row.after_value),
})

const MAX_ENTRIES = 5000

export class ChangeLogRepository {
  private readonly db: Database

  constructor(db: Database) {
    this.db = db
  }

  insert(entry: NewChangeLogEntry): void {
    this.db.run(
      `INSERT INTO change_log (id, created_at, user_id, user_name, faculty_id, cohort_id, cohort_name, action, day, slot, stream_id, before_value, after_value)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      createId(),
      nowIso(),
      entry.userId,
      entry.userName,
      entry.facultyId,
      entry.cohortId,
      entry.cohortName,
      entry.action,
      entry.day,
      entry.slot,
      entry.streamId,
      entry.before ? JSON.stringify(entry.before) : null,
      entry.after ? JSON.stringify(entry.after) : null,
    )
    this.db.run(
      `DELETE FROM change_log WHERE id NOT IN (SELECT id FROM change_log ORDER BY created_at DESC LIMIT ${MAX_ENTRIES})`,
    )
  }

  findRecent(limit: number, facultyId?: string): ChangeLogEntry[] {
    const rows = facultyId
      ? this.db.all<ChangeLogRow>(
          'SELECT * FROM change_log WHERE faculty_id = ? ORDER BY created_at DESC LIMIT ?',
          facultyId,
          limit,
        )
      : this.db.all<ChangeLogRow>('SELECT * FROM change_log ORDER BY created_at DESC LIMIT ?', limit)
    return rows.map(toEntry)
  }

  deleteAll(): void {
    this.db.run('DELETE FROM change_log')
  }
}
