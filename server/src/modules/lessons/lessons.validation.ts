import { badRequest } from '../../core/http/http-error.ts'
import { normalizeName } from '../../core/utils/id.ts'
import { asRecord, requireArray, requireOneOf, requireString, stringList } from '../../core/validation/validators.ts'
import type { Cohort } from '../cohorts/cohorts.types.ts'
import {
  buildDaySlots,
  DAY_KEYS,
  DAY_LABELS,
  MAX_LESSON_PARTS,
  SLOT_KEYS,
  type DayKey,
  type SlotKey,
} from '../schedule-config/schedule-config.constants.ts'
import type { LessonKey, LessonPart, SaveLessonInput } from './lessons.types.ts'

const uniqueNames = (names: string[]): string[] => {
  const seen = new Set<string>()
  return names.filter((name) => {
    const key = normalizeName(name)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

export const getCohortDaySlots = (cohort: Cohort, day: DayKey): SlotKey[] =>
  buildDaySlots(cohort.settings.daySlotStart[day] ?? '1-2')

/** Ստուգում է, որ վանդակը գոյություն ունի կուրսի աղյուսակում։ */
export const parseLessonKey = (cohort: Cohort, raw: { day: unknown; slot: unknown; streamId: unknown }): LessonKey => {
  const day = requireOneOf(raw.day, DAY_KEYS, 'Օր')
  const slot = requireOneOf(raw.slot, SLOT_KEYS, 'Դասաժամ')
  const streamId = requireString(raw.streamId, 'Հոսք', { max: 40 })

  if (!cohort.settings.days.includes(day)) throw badRequest(`${DAY_LABELS[day]}-ը ներառված չէ այս կուրսի դասացուցակում`)
  if (!getCohortDaySlots(cohort, day).includes(slot)) throw badRequest(`${slot} դասաժամը ներառված չէ այս օրվա աղյուսակում`)
  if (!cohort.settings.streams.some((stream) => stream.id === streamId)) throw badRequest('Նման հոսք գոյություն չունի')

  return { cohortId: cohort.id, day, slot, streamId }
}

/** Մաքրում է մասերը. դատարկ առարկայով մասը չի կարող ունենալ դասախոս կամ լսարան։ */
export const parseLessonParts = (value: unknown): LessonPart[] => {
  const rawParts = requireArray(value, 'Դասի մասեր', { min: 1, max: MAX_LESSON_PARTS })
  return rawParts.map((raw, index) => {
    const part = asRecord(raw, `${index + 1}-րդ մասը`)
    const subject = typeof part.subject === 'string' ? part.subject.trim().slice(0, 200) : ''
    if (!subject) return { subject: '', lecturers: [], rooms: [] }
    return {
      subject,
      lecturers: uniqueNames(stringList(part.lecturers, 'Դասախոսներ')),
      rooms: uniqueNames(stringList(part.rooms, 'Լսարաններ')),
    }
  })
}

export const isEmptyLesson = (parts: LessonPart[]): boolean => parts.every((part) => !part.subject)

export const parseSaveLessonInput = (cohort: Cohort, body: unknown): SaveLessonInput => {
  const record = asRecord(body)
  return {
    ...parseLessonKey(cohort, { day: record.day, slot: record.slot, streamId: record.streamId }),
    parts: parseLessonParts(record.parts),
  }
}
