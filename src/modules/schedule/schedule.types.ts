import type { Faculty } from '../faculties/faculties.types'
import type { DayKey, SlotKey } from './schedule.constants'

export type CohortKind = 'year' | 'program'

export interface CohortStream {
  id: string
  name: string
}

export interface CohortSettings {
  streams: CohortStream[]
  days: DayKey[]
  daySlotStart: Partial<Record<DayKey, SlotKey>>
}

/** Կուրս (օր.՝ «1-ին կուրս») կամ առանձին ծրագիր (օր.՝ «Սերվիս»)։ */
export interface Cohort {
  id: string
  facultyId: string
  name: string
  kind: CohortKind
  sortOrder: number
  settings: CohortSettings
}

export interface LessonPart {
  subject: string
  lecturers: string[]
  rooms: string[]
}

export interface LessonKey {
  day: DayKey
  slot: SlotKey
  streamId: string
}

export interface Lesson extends LessonKey {
  id: string
  cohortId: string
  parts: LessonPart[]
  updatedAt: string
  updatedBy: string | null
}

export interface CohortSchedule {
  faculty: Faculty
  cohort: Cohort
  lessons: Lesson[]
}

export interface LessonLocation {
  facultyId: string
  facultyName: string
  cohortId: string
  cohortName: string
  streamId: string
  streamName: string
  partIndex: number
  partsCount: number
}

export interface ScheduleConflict {
  kind: 'lecturer' | 'room'
  name: string
  day: DayKey
  slot: SlotKey
  isInternal: boolean
  locations: LessonLocation[]
}

export interface SaveLessonPayload extends LessonKey {
  parts: LessonPart[]
}

/** Ով է զբաղեցնում դասախոսին կամ լսարանը նույն ժամին (այլ վանդակում կամ ֆակուլտետում)։ */
export interface Occupant {
  name: string
  partIndex: number
  partsCount: number
  location: LessonLocation
}

export interface SlotOccupancy {
  lecturers: Occupant[]
  rooms: Occupant[]
}

export interface SaveLessonResult {
  lesson: Lesson | null
  conflicts: ScheduleConflict[]
}

export interface UpdateCohortResult {
  cohort: Cohort
  removedLessons: number
}
