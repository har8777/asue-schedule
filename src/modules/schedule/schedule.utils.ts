import { DAY_KEYS, partLabel, SLOT_KEYS, SLOTS_PER_DAY, type DayKey, type SlotKey } from './schedule.constants'
import type { Cohort, CohortSettings, Lesson, LessonKey, LessonLocation, LessonPart, Occupant } from './schedule.types'

export const lessonKeyId = ({ day, slot, streamId }: LessonKey): string => `${day}|${slot}|${streamId}`

export const buildDaySlots = (start: SlotKey = '1-2'): SlotKey[] => {
  const startIndex = SLOT_KEYS.indexOf(start)
  return SLOT_KEYS.slice(startIndex, startIndex + SLOTS_PER_DAY)
}

export const getDaySlots = (settings: CohortSettings, day: DayKey): SlotKey[] =>
  buildDaySlots(settings.daySlotStart[day] ?? '1-2')

export const indexLessons = (lessons: Lesson[]): Map<string, Lesson> =>
  new Map(lessons.map((lesson) => [lessonKeyId(lesson), lesson]))

export const isLessonEmpty = (parts: LessonPart[]): boolean => parts.every((part) => !part.subject.trim())

/** Դասերը, որոնք դուրս կմնան աղյուսակից նոր կարգավորումներով (պետք է զգուշացնել)։ */
export const countLessonsOutsideGrid = (lessons: Lesson[], settings: CohortSettings): number => {
  const streamIds = new Set(settings.streams.map((stream) => stream.id))
  return lessons.filter(
    (lesson) =>
      !streamIds.has(lesson.streamId) ||
      !settings.days.includes(lesson.day) ||
      !getDaySlots(settings, lesson.day).includes(lesson.slot),
  ).length
}

/** Այսօրվա օրը, եթե այն կա աղյուսակում, հակառակ դեպքում՝ առաջին օրը։ */
export const pickInitialDay = (days: DayKey[]): DayKey => {
  const todayIndex = (new Date().getDay() + 6) % 7
  const today = DAY_KEYS[todayIndex]
  return days.includes(today) ? today : (days[0] ?? 'monday')
}

export const formatLocation = (location: LessonLocation): string => {
  const parts = [location.facultyName.replace(/ ֆակուլտետ$/, ''), location.cohortName, location.streamName]
  if (location.partsCount > 1) parts.push(partLabel(location.partIndex))
  return parts.join(' • ')
}

export const formatParts = (parts: LessonPart[] | null): string => {
  if (!parts || isLessonEmpty(parts)) return '—'
  return parts
    .map((part, index) => {
      const content = part.subject
        ? [part.subject, part.lecturers.join(', '), part.rooms.join(', ')].filter(Boolean).join(' / ')
        : '—'
      return parts.length > 1 ? `${partLabel(index)}: ${content}` : content
    })
    .join(' | ')
}

export const sortCohorts = (cohorts: Cohort[]): Cohort[] =>
  [...cohorts].sort((a, b) => (a.kind === b.kind ? a.sortOrder - b.sortOrder : a.kind === 'year' ? -1 : 1))

const normalizeName = (name: string): string => name.trim().replace(/\s+/g, ' ').toLocaleLowerCase('hy')

/**
 * Դասախոսի կամ լսարանի ընտրության տարբերակներ դասի կոնկրետ մասի համար։
 * Տարբերակը ոչ ակտիվ է, եթե՝
 * - նույն ժամին զբաղված է այլ վանդակում/ֆակուլտետում (ամբողջական դասը զբաղեցնում է երկու կեսն էլ),
 * - արդեն նշված է նույն վանդակի մյուս մասում։
 */
export const buildResourceOptions = (
  catalogNames: string[],
  occupants: Occupant[],
  parts: LessonPart[],
  partIndex: number,
  field: 'lecturers' | 'rooms',
): { value: string; disabledReason?: string }[] => {
  const partsCount = parts.length
  const names = new Map<string, string>()
  for (const name of [...catalogNames, ...occupants.map((occupant) => occupant.name)]) {
    if (!names.has(normalizeName(name))) names.set(normalizeName(name), name)
  }

  return [...names.entries()].map(([key, value]) => {
    const busy = occupants.find(
      (occupant) =>
        normalizeName(occupant.name) === key &&
        (occupant.partsCount === 1 || partsCount === 1 || occupant.partIndex === partIndex),
    )
    if (busy) return { value, disabledReason: `զբաղված է՝ ${formatLocation(busy.location)}` }

    const otherPart = parts.findIndex(
      (part, index) => index !== partIndex && part[field].some((item) => normalizeName(item) === key),
    )
    if (otherPart >= 0) return { value, disabledReason: `արդեն նշված է «${partLabel(otherPart)}»-ում` }
    return { value }
  })
}
