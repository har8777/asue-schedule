import type { Database, SqlParam } from '../../core/database/database.ts'
import type { CohortSettings } from '../cohorts/cohorts.types.ts'
import type { DayKey, SlotKey } from '../schedule-config/schedule-config.constants.ts'
import type { Lesson, LessonKey, LessonPart, LessonWithContext } from './lessons.types.ts'

interface LessonRow {
  id: string
  cohort_id: string
  day: DayKey
  slot: SlotKey
  stream_id: string
  parts: string
  updated_at: string
  updated_by: string | null
}

interface LessonContextRow extends LessonRow {
  faculty_id: string
  faculty_name: string
  faculty_short_name: string
  building: string
  cohort_name: string
  cohort_settings: string
}

const parseParts = (raw: string): LessonPart[] => {
  try {
    return JSON.parse(raw) as LessonPart[]
  } catch {
    return []
  }
}

const toLesson = (row: LessonRow): Lesson => ({
  id: row.id,
  cohortId: row.cohort_id,
  day: row.day,
  slot: row.slot,
  streamId: row.stream_id,
  parts: parseParts(row.parts),
  updatedAt: row.updated_at,
  updatedBy: row.updated_by,
})

const findStreamName = (rawSettings: string, streamId: string): string => {
  try {
    const settings = JSON.parse(rawSettings) as CohortSettings
    return settings.streams?.find((stream) => stream.id === streamId)?.name ?? streamId
  } catch {
    return streamId
  }
}

const CONTEXT_SELECT = `
  SELECT l.*, c.faculty_id, c.name AS cohort_name, c.settings AS cohort_settings,
         f.name AS faculty_name, f.short_name AS faculty_short_name, f.building
  FROM lessons l
  JOIN cohorts c ON c.id = l.cohort_id
  JOIN faculties f ON f.id = c.faculty_id`

export class LessonsRepository {
  private readonly db: Database

  constructor(db: Database) {
    this.db = db
  }

  findByCohort(cohortId: string): Lesson[] {
    return this.db.all<LessonRow>('SELECT * FROM lessons WHERE cohort_id = ?', cohortId).map(toLesson)
  }

  findAll(): Lesson[] {
    return this.db.all<LessonRow>('SELECT * FROM lessons').map(toLesson)
  }

  findOne(key: LessonKey): Lesson | null {
    const row = this.db.get<LessonRow>(
      'SELECT * FROM lessons WHERE cohort_id = ? AND day = ? AND slot = ? AND stream_id = ?',
      key.cohortId,
      key.day,
      key.slot,
      key.streamId,
    )
    return row ? toLesson(row) : null
  }

  /** Բոլոր դասերը՝ համատեքստով, ըստ ցանկության՝ միայն տրված օրվա/դասաժամի։ */
  findWithContext(filter: { day?: DayKey; slot?: SlotKey } = {}): LessonWithContext[] {
    const conditions: string[] = []
    const params: SqlParam[] = []
    if (filter.day) {
      conditions.push('l.day = ?')
      params.push(filter.day)
    }
    if (filter.slot) {
      conditions.push('l.slot = ?')
      params.push(filter.slot)
    }
    const where = conditions.length ? ` WHERE ${conditions.join(' AND ')}` : ''
    return this.db.all<LessonContextRow>(`${CONTEXT_SELECT}${where}`, ...params).map((row) => ({
      ...toLesson(row),
      facultyId: row.faculty_id,
      facultyName: row.faculty_name,
      facultyShortName: row.faculty_short_name,
      building: row.building,
      cohortName: row.cohort_name,
      streamName: findStreamName(row.cohort_settings, row.stream_id),
    }))
  }

  upsert(lesson: Lesson): void {
    this.db.run(
      `INSERT INTO lessons (id, cohort_id, day, slot, stream_id, parts, updated_at, updated_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT (cohort_id, day, slot, stream_id)
       DO UPDATE SET parts = excluded.parts, updated_at = excluded.updated_at, updated_by = excluded.updated_by`,
      lesson.id,
      lesson.cohortId,
      lesson.day,
      lesson.slot,
      lesson.streamId,
      JSON.stringify(lesson.parts),
      lesson.updatedAt,
      lesson.updatedBy,
    )
  }

  delete(key: LessonKey): number {
    return this.db.run(
      'DELETE FROM lessons WHERE cohort_id = ? AND day = ? AND slot = ? AND stream_id = ?',
      key.cohortId,
      key.day,
      key.slot,
      key.streamId,
    )
  }

  deleteById(id: string): void {
    this.db.run('DELETE FROM lessons WHERE id = ?', id)
  }

  deleteByCohort(cohortId: string): number {
    return this.db.run('DELETE FROM lessons WHERE cohort_id = ?', cohortId)
  }

  deleteByFaculty(facultyId: string): number {
    return this.db.run('DELETE FROM lessons WHERE cohort_id IN (SELECT id FROM cohorts WHERE faculty_id = ?)', facultyId)
  }

  deleteAll(): number {
    return this.db.run('DELETE FROM lessons')
  }
}
