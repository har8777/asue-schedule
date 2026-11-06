import type { LessonPart } from '../lessons/lessons.types.ts'
import { DAY_KEYS, SLOT_KEYS, type DayKey, type SlotKey } from '../schedule-config/schedule-config.constants.ts'

/**
 * Հին (localStorage-ի վրա հիմնված) տարբերակի «Backup JSON» ֆայլի վերլուծիչ։
 * Ձևաչափը՝ allSchedules[ֆակուլտետի անուն][կուրսի անուն]["monday-1-2-stream-1"] = { course, prof, room },
 * որտեղ յուրաքանչյուր դաշտ կամ տեքստ է, կամ { type: 'split', items?, part1, part2 }։
 */
export interface LegacyCell {
  facultyName: string
  cohortName: string
  day: DayKey
  slot: SlotKey
  streamId: string
  parts: LessonPart[]
}

const CELL_ID_PATTERN = new RegExp(`^(${DAY_KEYS.join('|')})-(\\d{1,2}-\\d{1,2})-(stream-\\d{1,2})$`)

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value)

const toItems = (value: unknown): string[] => {
  if (typeof value === 'string') return [value]
  if (!isRecord(value) || value.type !== 'split') return []
  if (Array.isArray(value.items) && value.items.length > 0) return value.items.map((item) => String(item ?? ''))
  return [String(value.part1 ?? ''), String(value.part2 ?? '')]
}

const splitNames = (value: string | undefined): string[] =>
  (value ?? '')
    .split(',')
    .map((name) => name.trim())
    .filter((name) => name && name !== '—')

const toParts = (cell: Record<string, unknown>): LessonPart[] => {
  const courses = toItems(cell.course)
  const lecturers = toItems(cell.prof)
  const rooms = toItems(cell.room)
  const count = Math.max(courses.length, lecturers.length, rooms.length, 1)
  const isWholeCourse = typeof cell.course === 'string'

  return Array.from({ length: count }, (_, index) => {
    const subject = (isWholeCourse ? courses[0] : courses[index])?.trim() ?? ''
    if (!subject) return { subject: '', lecturers: [], rooms: [] }
    return { subject, lecturers: splitNames(lecturers[index]), rooms: splitNames(rooms[index]) }
  })
}

export const isLegacyBackup = (data: unknown): data is { allSchedules: Record<string, unknown> } =>
  isRecord(data) && isRecord(data.allSchedules)

export const parseLegacyBackup = (data: { allSchedules: Record<string, unknown> }): LegacyCell[] => {
  const cells: LegacyCell[] = []
  for (const [facultyName, years] of Object.entries(data.allSchedules)) {
    if (!isRecord(years)) continue
    for (const [cohortName, schedule] of Object.entries(years)) {
      if (!isRecord(schedule)) continue
      for (const [cellId, cell] of Object.entries(schedule)) {
        const match = cellId.match(CELL_ID_PATTERN)
        if (!match || !isRecord(cell)) continue
        const slot = match[2] as SlotKey
        if (!SLOT_KEYS.includes(slot)) continue
        const parts = toParts(cell)
        if (parts.every((part) => !part.subject)) continue
        cells.push({
          facultyName: facultyName.trim(),
          cohortName: cohortName.trim(),
          day: match[1] as DayKey,
          slot,
          streamId: match[3],
          parts,
        })
      }
    }
  }
  return cells
}
