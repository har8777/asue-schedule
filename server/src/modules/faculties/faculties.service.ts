import type { Database } from '../../core/database/database.ts'
import { conflict, notFound } from '../../core/http/http-error.ts'
import { createId, nowIso } from '../../core/utils/id.ts'
import { asRecord, optionalString, requireString } from '../../core/validation/validators.ts'
import type { AuthUser } from '../auth/auth.types.ts'
import type { ChangeLogRepository } from '../change-log/change-log.repository.ts'
import { createDefaultCohortSettings, DEFAULT_YEAR_COHORTS } from '../cohorts/cohorts.constants.ts'
import type { CohortsRepository } from '../cohorts/cohorts.repository.ts'
import type { LessonsRepository } from '../lessons/lessons.repository.ts'
import type { FacultiesRepository } from './faculties.repository.ts'
import type { Faculty, FacultyInput, FacultyWithCohorts } from './faculties.types.ts'

export class FacultiesService {
  private readonly db: Database
  private readonly faculties: FacultiesRepository
  private readonly cohorts: CohortsRepository
  private readonly lessons: LessonsRepository
  private readonly changeLog: ChangeLogRepository

  constructor(
    db: Database,
    faculties: FacultiesRepository,
    cohorts: CohortsRepository,
    lessons: LessonsRepository,
    changeLog: ChangeLogRepository,
  ) {
    this.db = db
    this.faculties = faculties
    this.cohorts = cohorts
    this.lessons = lessons
    this.changeLog = changeLog
  }

  list(): FacultyWithCohorts[] {
    const cohorts = this.cohorts.findAll()
    return this.faculties.findAll().map((faculty) => ({
      ...faculty,
      cohorts: cohorts.filter((cohort) => cohort.facultyId === faculty.id),
    }))
  }

  getById(id: string): FacultyWithCohorts {
    const faculty = this.faculties.findById(id)
    if (!faculty) throw notFound('Ֆակուլտետը չի գտնվել')
    return { ...faculty, cohorts: this.cohorts.findByFaculty(id) }
  }

  /** Ստեղծում է ֆակուլտետ՝ ստանդարտ 5 կուրսերով։ */
  create(input: unknown, id: string = createId()): FacultyWithCohorts {
    const data = this.parseInput(input)
    if (this.faculties.findByName(data.name)) throw conflict(`«${data.name}» ֆակուլտետն արդեն գոյություն ունի`)

    return this.db.transaction(() => {
      const faculty: Faculty = { id, ...data, sortOrder: this.faculties.nextSortOrder(), createdAt: nowIso() }
      this.faculties.insert(faculty)
      DEFAULT_YEAR_COHORTS.forEach((name, index) =>
        this.cohorts.insert({
          id: createId(),
          facultyId: faculty.id,
          name,
          kind: 'year',
          sortOrder: index + 1,
          settings: createDefaultCohortSettings(),
        }),
      )
      return this.getById(faculty.id)
    })
  }

  update(id: string, input: unknown): FacultyWithCohorts {
    const faculty = this.faculties.findById(id)
    if (!faculty) throw notFound('Ֆակուլտետը չի գտնվել')
    const data = this.parseInput({ ...faculty, ...asRecord(input) })
    const sameName = this.faculties.findByName(data.name)
    if (sameName && sameName.id !== id) throw conflict(`«${data.name}» ֆակուլտետն արդեն գոյություն ունի`)
    this.faculties.update({ ...faculty, ...data })
    return this.getById(id)
  }

  delete(id: string): void {
    if (!this.faculties.findById(id)) throw notFound('Ֆակուլտետը չի գտնվել')
    this.faculties.delete(id)
  }

  clearLessons(user: AuthUser, id: string): { deleted: number } {
    const faculty = this.faculties.findById(id)
    if (!faculty) throw notFound('Ֆակուլտետը չի գտնվել')
    return this.db.transaction(() => {
      const deleted = this.lessons.deleteByFaculty(id)
      this.logClear(user, 'faculty.clear', id)
      return { deleted }
    })
  }

  clearAllLessons(user: AuthUser): { deleted: number } {
    return this.db.transaction(() => {
      const deleted = this.lessons.deleteAll()
      this.logClear(user, 'schedule.clear-all', null)
      return { deleted }
    })
  }

  private logClear(user: AuthUser, action: 'faculty.clear' | 'schedule.clear-all', facultyId: string | null) {
    this.changeLog.insert({
      userId: user.id,
      userName: user.displayName,
      facultyId,
      cohortId: null,
      cohortName: '',
      action,
      day: '',
      slot: '',
      streamId: '',
      before: null,
      after: null,
    })
  }

  private parseInput(input: unknown): FacultyInput {
    const body = asRecord(input)
    const name = requireString(body.name, 'Անվանում', { max: 150 })
    return {
      name,
      shortName: optionalString(body.shortName, 'Կարճ անվանում', 60) || name,
      // Ըստ նախնականի յուրաքանչյուր ֆակուլտետ ունի իր մասնաշենքը (լսարանները առանձին են)
      building: optionalString(body.building, 'Մասնաշենք', 100) || name,
    }
  }
}
