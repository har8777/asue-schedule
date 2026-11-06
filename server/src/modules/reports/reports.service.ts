import { notFound } from '../../core/http/http-error.ts'
import { normalizeName } from '../../core/utils/id.ts'
import type { CatalogRepository } from '../catalog/catalog.repository.ts'
import type { FacultiesRepository } from '../faculties/faculties.repository.ts'
import { detectAllConflicts } from '../lessons/conflict-detector.ts'
import type { LessonsRepository } from '../lessons/lessons.repository.ts'
import type { LessonWithContext, ScheduleConflict } from '../lessons/lessons.types.ts'
import { DAY_KEYS, SLOT_KEYS, type DayKey, type SlotKey } from '../schedule-config/schedule-config.constants.ts'
import type { FloorRooms, LessonPlacement, SearchResults } from './reports.types.ts'

const SEARCH_LIMIT = 50

const toPlacements = (lesson: LessonWithContext): LessonPlacement[] =>
  lesson.parts
    .map((part, partIndex) => ({
      day: lesson.day,
      slot: lesson.slot,
      partIndex,
      partsCount: lesson.parts.length,
      subject: part.subject,
      lecturers: part.lecturers,
      rooms: part.rooms,
      facultyId: lesson.facultyId,
      facultyName: lesson.facultyName,
      cohortId: lesson.cohortId,
      cohortName: lesson.cohortName,
      streamId: lesson.streamId,
      streamName: lesson.streamName,
    }))
    .filter((placement) => placement.subject)

/** Ժամանակագրական կարգ՝ օր → դասաժամ → մաս։ */
const byTime = (a: LessonPlacement, b: LessonPlacement): number =>
  DAY_KEYS.indexOf(a.day) - DAY_KEYS.indexOf(b.day) ||
  SLOT_KEYS.indexOf(a.slot) - SLOT_KEYS.indexOf(b.slot) ||
  a.partIndex - b.partIndex

const compareNatural = (a: string, b: string): number => a.localeCompare(b, 'hy', { numeric: true })

export class ReportsService {
  private readonly lessons: LessonsRepository
  private readonly catalog: CatalogRepository
  private readonly faculties: FacultiesRepository

  constructor(lessons: LessonsRepository, catalog: CatalogRepository, faculties: FacultiesRepository) {
    this.lessons = lessons
    this.catalog = catalog
    this.faculties = faculties
  }

  /** Դասախոսի անհատական դասացուցակը բոլոր ֆակուլտետներից։ */
  lecturerSchedule(name: string): LessonPlacement[] {
    const key = normalizeName(name)
    return this.lessons
      .findWithContext()
      .flatMap(toPlacements)
      .filter((placement) => placement.lecturers.some((lecturer) => normalizeName(lecturer) === key))
      .sort(byTime)
  }

  /** Ֆակուլտետի լսարանների զբաղվածությունը տվյալ օրը (և ըստ ցանկության՝ դասաժամին)։ */
  freeRooms(facultyId: string, day: DayKey, slot: SlotKey | null): FloorRooms[] {
    const faculty = this.faculties.findById(facultyId)
    if (!faculty) throw notFound('Ֆակուլտետը չի գտնվել')
    const building = normalizeName(faculty.building)

    const occupied = new Map<string, LessonPlacement[]>()
    this.lessons
      .findWithContext({ day, slot: slot ?? undefined })
      .filter((lesson) => normalizeName(lesson.building) === building)
      .flatMap(toPlacements)
      .forEach((placement) =>
        placement.rooms.forEach((room) => {
          const key = normalizeName(room)
          occupied.set(key, [...(occupied.get(key) ?? []), placement])
        }),
      )

    const floors = new Map<string, FloorRooms>()
    for (const room of this.catalog.findByFaculty(facultyId).filter((item) => item.type === 'room')) {
      const floorName = room.floor || 'Այլ'
      const floor = floors.get(floorName) ?? { floor: floorName, rooms: [] }
      const occupiedBy = (occupied.get(normalizeName(room.name)) ?? []).sort(byTime)
      floor.rooms.push({ name: room.name, isFree: occupiedBy.length === 0, occupiedBy })
      floors.set(floorName, floor)
    }
    return [...floors.values()]
      .sort((a, b) => compareNatural(a.floor, b.floor))
      .map((floor) => ({ ...floor, rooms: floor.rooms.sort((a, b) => compareNatural(a.name, b.name)) }))
  }

  conflicts(facultyId?: string): ScheduleConflict[] {
    const all = detectAllConflicts(this.lessons.findWithContext())
    const filtered = facultyId
      ? all.filter((conflict) => conflict.locations.some((location) => location.facultyId === facultyId))
      : all
    return filtered.sort(
      (a, b) => DAY_KEYS.indexOf(a.day) - DAY_KEYS.indexOf(b.day) || SLOT_KEYS.indexOf(a.slot) - SLOT_KEYS.indexOf(b.slot),
    )
  }

  search(query: string): SearchResults {
    const needle = normalizeName(query)
    if (needle.length < 2) return { lessons: [], catalog: [] }
    const matches = (value: string) => normalizeName(value).includes(needle)

    const lessons = this.lessons
      .findWithContext()
      .flatMap(toPlacements)
      .filter(
        (placement) =>
          matches(placement.subject) ||
          placement.lecturers.some(matches) ||
          placement.rooms.some(matches) ||
          matches(placement.cohortName) ||
          matches(placement.facultyName),
      )
      .sort(byTime)
      .slice(0, SEARCH_LIMIT)

    const facultyNames = new Map(this.faculties.findAll().map((faculty) => [faculty.id, faculty.name]))
    const catalog = this.catalog
      .findAll()
      .filter((item) => matches(item.name))
      .slice(0, SEARCH_LIMIT)
      .map((item) => ({ type: item.type, name: item.name, facultyId: item.facultyId, facultyName: facultyNames.get(item.facultyId) ?? '' }))

    return { lessons, catalog }
  }
}
