import type { LessonPart } from '../schedule/schedule.types'

export type ChangeLogAction =
  | 'lesson.save'
  | 'lesson.delete'
  | 'cohort.clear'
  | 'cohort.settings'
  | 'faculty.clear'
  | 'schedule.clear-all'
  | 'backup.restore'

export const CHANGE_LOG_ACTION_LABELS: Record<ChangeLogAction, string> = {
  'lesson.save': 'Դասի փոփոխություն',
  'lesson.delete': 'Դասը ջնջվեց',
  'cohort.clear': 'Կուրսի դասացուցակը մաքրվեց',
  'cohort.settings': 'Կուրսի կառուցվածքը փոխվեց',
  'faculty.clear': 'Ֆակուլտետի դասացուցակը մաքրվեց',
  'schedule.clear-all': 'Ամբողջ դասացուցակը մաքրվեց',
  'backup.restore': 'Վերականգնում պահուստից',
}

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
