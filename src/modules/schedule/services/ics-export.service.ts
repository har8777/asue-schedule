import { downloadText, toFileName } from '../../common/utils/download'
import type { PublicSettings } from '../../settings/settings.types'
import { DAY_KEYS, type DayKey, type SlotKey } from '../schedule.constants'

/** Մեկ կրկնվող իրադարձություն (դաս կամ դասի մաս)։ */
export interface CalendarLesson {
  uid: string
  day: DayKey
  slot: SlotKey
  partIndex: number
  partsCount: number
  summary: string
  description: string
  location: string
}

const pad = (value: number) => String(value).padStart(2, '0')

const formatDate = (date: Date) => `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}`

const toMinutes = (time: string) => {
  const [hours, minutes] = time.split(':').map(Number)
  return hours * 60 + minutes
}

const minutesToTime = (total: number) => `${pad(Math.floor(total / 60))}${pad(total % 60)}00`

/** RFC 5545. ստորակետը, կետ-ստորակետը և նոր տողը պետք է escape արվեն։ */
const escapeText = (value: string) => value.replace(/\\/g, '\\\\').replace(/([,;])/g, '\\$1').replace(/\n/g, '\\n')

const resolveSemesterMonday = (settings: PublicSettings): Date => {
  const base = settings.semesterStartDate ? new Date(`${settings.semesterStartDate}T00:00:00`) : new Date()
  const monday = new Date(base)
  monday.setDate(base.getDate() - ((base.getDay() + 6) % 7))
  return monday
}

/**
 * Ստեղծում է .ics ֆայլ (Google / Apple / Outlook օրացույցների համար)։ Բաժանված դասի
 * մասերը դասաժամի մեջ դասավորվում են հաջորդաբար, ինչպես նախորդ տարբերակում։
 */
export const buildIcsCalendar = (lessons: CalendarLesson[], settings: PublicSettings, calendarName: string): string => {
  const monday = resolveSemesterMonday(settings)
  const stamp = `${formatDate(new Date())}T000000Z`
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//ASUE//Academic Schedule//HY',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeText(calendarName)}`,
  ]

  for (const lesson of lessons) {
    const slotTime = settings.slotTimes[lesson.slot]
    if (!slotTime || !lesson.summary) continue
    const start = toMinutes(slotTime.start)
    const segment = Math.floor((toMinutes(slotTime.end) - start) / lesson.partsCount)
    const eventStart = start + segment * lesson.partIndex
    const date = new Date(monday)
    date.setDate(monday.getDate() + DAY_KEYS.indexOf(lesson.day))

    lines.push(
      'BEGIN:VEVENT',
      `UID:${lesson.uid}@asue-schedule`,
      `DTSTAMP:${stamp}`,
      `DTSTART:${formatDate(date)}T${minutesToTime(eventStart)}`,
      `DTEND:${formatDate(date)}T${minutesToTime(eventStart + segment)}`,
      `RRULE:FREQ=WEEKLY;COUNT=${settings.weeksCount}`,
      `SUMMARY:${escapeText(lesson.summary)}`,
      `DESCRIPTION:${escapeText(lesson.description)}`,
      `LOCATION:${escapeText(lesson.location)}`,
      'BEGIN:VALARM',
      'TRIGGER:-PT15M',
      'ACTION:DISPLAY',
      `DESCRIPTION:${escapeText(`Դասի հիշեցում՝ ${lesson.summary}`)}`,
      'END:VALARM',
      'END:VEVENT',
    )
  }
  lines.push('END:VCALENDAR')
  return lines.join('\r\n')
}

export const downloadIcsCalendar = (lessons: CalendarLesson[], settings: PublicSettings, name: string): void =>
  downloadText(buildIcsCalendar(lessons, settings, name), `${toFileName(name)}.ics`, 'text/calendar;charset=utf-8')
