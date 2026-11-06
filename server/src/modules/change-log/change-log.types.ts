import type { LessonPart } from '../lessons/lessons.types.ts'

export type ChangeLogAction =
  | 'lesson.save'
  | 'lesson.delete'
  | 'cohort.clear'
  | 'cohort.settings'
  | 'faculty.clear'
  | 'schedule.clear-all'
  | 'backup.restore'

export interface ChangeLogEntry {
  id: string
  createdAt: string
  userId: string | null
  userName: string
  facultyId: string | null
  cohortId: string | null
  cohortName: string
  action: ChangeLogAction
  day: string
  slot: string
  streamId: string
  before: LessonPart[] | null
  after: LessonPart[] | null
}

export type NewChangeLogEntry = Omit<ChangeLogEntry, 'id' | 'createdAt'>
