import type { DayKey, SlotKey } from '../schedule-config/schedule-config.constants.ts'

/**
 * Դասի մի մասը։ Սովորական դասը ունի մեկ մաս, իսկ «Համարիչ / Հայտարար» դասը՝ երկու
 * կամ ավելի մաս (յուրաքանչյուրն իր առարկայով, դասախոսներով և լսարաններով)։
 */
export interface LessonPart {
  subject: string
  lecturers: string[]
  rooms: string[]
}

export interface LessonKey {
  cohortId: string
  day: DayKey
  slot: SlotKey
  streamId: string
}

export interface Lesson extends LessonKey {
  id: string
  parts: LessonPart[]
  updatedAt: string
  updatedBy: string | null
}

/** Դաս՝ ֆակուլտետի, կուրսի և հոսքի տեղեկություններով (հաշվետվությունների համար)։ */
export interface LessonWithContext extends Lesson {
  facultyId: string
  facultyName: string
  facultyShortName: string
  building: string
  cohortName: string
  streamName: string
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

export type ConflictKind = 'lecturer' | 'room'

/** Բախում. նույն դասախոսը կամ լսարանը նույն ժամին մի քանի տեղում։ */
export interface ScheduleConflict {
  kind: ConflictKind
  name: string
  day: DayKey
  slot: SlotKey
  /** true, եթե բախումը նույն վանդակի մասերի միջև է։ */
  isInternal: boolean
  locations: LessonLocation[]
}

export interface SaveLessonInput extends LessonKey {
  parts: LessonPart[]
  force: boolean
}
