import { notFound } from '../../core/http/http-error.ts'
import type { AuthUser } from '../auth/auth.types.ts'
import { assertFacultyAccess } from '../auth/auth.guards.ts'
import type { FacultiesRepository } from '../faculties/faculties.repository.ts'
import type { LessonPart } from '../lessons/lessons.types.ts'
import type { CatalogRepository } from './catalog.repository.ts'
import type { CatalogImportRow, CatalogItem, CatalogType, FacultyCatalog } from './catalog.types.ts'

/** Լսարանի համարից գուշակում է հարկը (օր.՝ «305» → «3-րդ հարկ»)։ */
export const guessFloor = (room: string): string => {
  const match = room.trim().match(/^(\d)\d{2}/)
  if (!match) return 'Այլ'
  const floor = Number(match[1])
  return `${floor === 1 ? '1-ին' : `${floor}-րդ`} հարկ`
}

export class CatalogService {
  private readonly catalog: CatalogRepository
  private readonly faculties: FacultiesRepository

  constructor(catalog: CatalogRepository, faculties: FacultiesRepository) {
    this.catalog = catalog
    this.faculties = faculties
  }

  getForFaculty(facultyId: string): FacultyCatalog {
    if (!this.faculties.findById(facultyId)) throw notFound('Ֆակուլտետը չի գտնվել')
    const items = this.catalog.findByFaculty(facultyId)
    return {
      subjects: items.filter((item) => item.type === 'subject'),
      lecturers: items.filter((item) => item.type === 'lecturer'),
      rooms: items.filter((item) => item.type === 'room'),
    }
  }

  allLecturerNames(extraNames: string[]): string[] {
    const names = new Set([...this.catalog.findAllByType('lecturer').map((item) => item.name), ...extraNames])
    return [...names].sort((a, b) => a.localeCompare(b, 'hy'))
  }

  add(user: AuthUser, facultyId: string, type: CatalogType, name: string, floor: string): FacultyCatalog {
    assertFacultyAccess(user, facultyId)
    if (!this.faculties.findById(facultyId)) throw notFound('Ֆակուլտետը չի գտնվել')
    this.catalog.insertIfMissing(facultyId, type, name, type === 'room' ? floor || guessFloor(name) : '')
    return this.getForFaculty(facultyId)
  }

  remove(user: AuthUser, itemId: string): void {
    const item = this.catalog.findById(itemId)
    if (!item) throw notFound('Տարրը չի գտնվել')
    assertFacultyAccess(user, item.facultyId)
    this.catalog.delete(itemId)
  }

  /**
   * Դաս պահպանելիս նոր առարկաներն ու դասախոսները ավտոմատ ավելանում են տեղեկատուին։
   * Լսարանները՝ ոչ. ձեռքով նշված լսարանը ժամանակավոր է և պահվում է միայն տվյալ դասում։
   * Լսարանների ցուցակը կառավարվում է միայն «Տեղեկատու» էջից։
   */
  learnFromParts(facultyId: string, parts: LessonPart[]): void {
    for (const part of parts) {
      if (part.subject) this.catalog.insertIfMissing(facultyId, 'subject', part.subject)
      part.lecturers.forEach((name) => this.catalog.insertIfMissing(facultyId, 'lecturer', name))
    }
  }

  importRows(rows: CatalogImportRow[]): { added: number; skipped: number } {
    const facultyByName = new Map(this.faculties.findAll().map((faculty) => [faculty.name, faculty.id]))
    let added = 0
    let skipped = 0
    for (const row of rows) {
      const facultyId = facultyByName.get(row.facultyName)
      const isAdded =
        facultyId !== undefined &&
        this.catalog.insertIfMissing(facultyId, row.type, row.name, row.type === 'room' ? row.floor || guessFloor(row.name) : '')
      if (isAdded) added++
      else skipped++
    }
    return { added, skipped }
  }

  exportAll(): CatalogItem[] {
    return this.catalog.findAll()
  }
}
