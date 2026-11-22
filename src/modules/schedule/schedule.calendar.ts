import type { PublicSettings } from '../settings/settings.types'
import { DAY_KEYS, SLOT_KEYS, type DayKey, type SlotKey } from './schedule.constants'
import type { Cohort, Lesson, LessonPart } from './schedule.types'
import { getDaySlots, lessonKeyId } from './schedule.utils'

/**
 * Պաշտոնական դասացուցակի տողերի կառուցում (ՀՊՏՀ-ի ձևաչափ)։
 *
 * Կիսամյակը բացվում է շաբաթ առ շաբաթ՝ իրական ամսաթվերով։ «Համարիչ» դասը անցնում
 * է կենտ շաբաթներին (1, 3, 5 …), «Հայտարար»-ը՝ զույգ շաբաթներին (2, 4, 6 …)։
 * Ավելի շատ մասերի դեպքում դրանք հերթափոխվում են նույն սկզբունքով։
 */

/** Կիսամյակի առաջին շաբաթվա երկուշաբթին։ */
export const resolveSemesterMonday = (settings: PublicSettings): Date => {
  const base = settings.semesterStartDate ? new Date(`${settings.semesterStartDate}T00:00:00`) : new Date()
  const monday = new Date(base)
  monday.setDate(base.getDate() - ((base.getDay() + 6) % 7))
  return monday
}

const pad = (value: number): string => String(value).padStart(2, '0')

export const formatDate = (date: Date): string =>
  `${pad(date.getDate())}.${pad(date.getMonth() + 1)}.${date.getFullYear()}`

/** Տվյալ շաբաթում ո՞ր մասն է անցնում (1-ին շաբաթ՝ Համարիչ, 2-րդ՝ Հայտարար …)։ */
export const partForWeek = (week: number, partsCount: number): number =>
  partsCount <= 1 ? 0 : (week - 1) % partsCount

/** Կուրսի բոլոր օրերի դասաժամերի միավորումը՝ սյունակների համար։ */
export const collectSlots = (cohort: Cohort): SlotKey[] => {
  const used = new Set<SlotKey>()
  cohort.settings.days.forEach((day) => getDaySlots(cohort.settings, day).forEach((slot) => used.add(slot)))
  return SLOT_KEYS.filter((slot) => used.has(slot))
}

export interface OfficialCell {
  slot: SlotKey
  part: LessonPart | null
}

export interface OfficialRow {
  week: number
  /** Շաբաթվա առաջին տողում՝ քանի՞ տող է զբաղեցնում (rowSpan)։ */
  weekRowSpan: number
  day: DayKey
  date: Date | null
  cells: OfficialCell[]
}

export interface OfficialScheduleOptions {
  cohort: Cohort
  lessons: Map<string, Lesson>
  streamId: string
  settings: PublicSettings
  slots: SlotKey[]
}

/** Կառուցում է տողերը՝ շաբաթ առ շաբաթ, օր առ օր։ */
export const buildOfficialRows = ({
  cohort,
  lessons,
  streamId,
  settings,
  slots,
}: OfficialScheduleOptions): OfficialRow[] => {
  const monday = settings.semesterStartDate ? resolveSemesterMonday(settings) : null
  const days = DAY_KEYS.filter((day) => cohort.settings.days.includes(day))
  const weeks = Math.max(1, Math.min(settings.weeksCount || 16, 52))
  const rows: OfficialRow[] = []

  for (let week = 1; week <= weeks; week += 1) {
    days.forEach((day, dayIndex) => {
      const daySlots = getDaySlots(cohort.settings, day)
      const date = monday ? new Date(monday) : null
      if (date) date.setDate(monday!.getDate() + (week - 1) * 7 + DAY_KEYS.indexOf(day))

      rows.push({
        week,
        weekRowSpan: dayIndex === 0 ? days.length : 0,
        day,
        date,
        cells: slots.map((slot) => {
          if (!daySlots.includes(slot)) return { slot, part: null }
          const lesson = lessons.get(lessonKeyId({ day, slot, streamId }))
          if (!lesson || lesson.parts.length === 0) return { slot, part: null }
          const part = lesson.parts[partForWeek(week, lesson.parts.length)]
          return { slot, part: part?.subject ? part : null }
        }),
      })
    })
  }
  return rows
}
