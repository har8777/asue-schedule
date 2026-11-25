import type { Database } from '../../core/database/database.ts'
import { conflict, notFound } from '../../core/http/http-error.ts'
import { createId, nowIso } from '../../core/utils/id.ts'
import { asRecord, optionalString, requireString } from '../../core/validation/validators.ts'
import { isSuperAdmin } from '../auth/auth.guards.ts'
import type { AuthUser } from '../auth/auth.types.ts'
import type { ChangeLogRepository } from '../change-log/change-log.repository.ts'
import { createDefaultCohortSettings, DEFAULT_YEAR_COHORTS } from '../cohorts/cohorts.constants.ts'
import type { CohortsRepository } from '../cohorts/cohorts.repository.ts'
import type { LessonsRepository } from '../lessons/lessons.repository.ts'
import type { DivisionsRepository } from '../divisions/divisions.repository.ts'
import type { FacultiesRepository } from './faculties.repository.ts'
import { readImageField } from '../settings/settings.images.ts'
import type { Faculty, FacultyInput, FacultyWithCohorts } from './faculties.types.ts'

export class FacultiesService {
  private readonly db: Database
  private readonly faculties: FacultiesRepository
  private readonly cohorts: CohortsRepository
  private readonly divisions: DivisionsRepository
  private readonly lessons: LessonsRepository
  private readonly changeLog: ChangeLogRepository

  constructor(
    db: Database,
    faculties: FacultiesRepository,
    cohorts: CohortsRepository,
    divisions: DivisionsRepository,
    lessons: LessonsRepository,
    changeLog: ChangeLogRepository,
  ) {
    this.db = db
    this.faculties = faculties
    this.cohorts = cohorts
    this.divisions = divisions
    this.lessons = lessons
    this.changeLog = changeLog
  }

  /**
   * Սևագիր ֆակուլտետներն ու կուրսերը տեսնում է միայն գլխավոր ադմինը։ Մնացածի
   * համար (ֆակուլտետների ադմիններ և ուսանողներ) դրանք կարծես գոյություն չունեն։
   */
  list(user: AuthUser | null = null): FacultyWithCohorts[] {
    const showDrafts = isSuperAdmin(user)
    const cohorts = this.cohorts.findAll()
    return this.faculties
      .findAll()
      .filter((faculty) => showDrafts || faculty.isPublished)
      .map((faculty) => ({
        ...faculty,
        cohorts: cohorts.filter(
          (cohort) => cohort.facultyId === faculty.id && (showDrafts || cohort.isPublished),
        ),
        divisions: this.divisions
          .findByFaculty(faculty.id)
          .filter((division) => showDrafts || division.isPublished),
      }))
  }

  getById(id: string, user: AuthUser | null = null): FacultyWithCohorts {
    const showDrafts = isSuperAdmin(user)
    const faculty = this.faculties.findById(id)
    if (!faculty || (!showDrafts && !faculty.isPublished)) throw notFound('Ֆակուլտետը չի գտնվել')
    return {
      ...faculty,
      cohorts: this.cohorts.findByFaculty(id).filter((cohort) => showDrafts || cohort.isPublished),
      divisions: this.divisions.findByFaculty(id).filter((division) => showDrafts || division.isPublished),
    }
  }

  /** Հրապարակում կամ հետ է բերում սևագրի. ֆակուլտետը՝ իր կուրսերով կամ առանձին։ */
  setPublished(id: string, isPublished: boolean, withCohorts = true): FacultyWithCohorts {
    const faculty = this.faculties.findById(id)
    if (!faculty) throw notFound('Ֆակուլտետը չի գտնվել')
    return this.db.transaction(() => {
      this.faculties.update({ ...faculty, isPublished })
      if (withCohorts) {
        this.cohorts.findByFaculty(id).forEach((cohort) => this.cohorts.update({ ...cohort, isPublished }))
        this.divisions.findByFaculty(id).forEach((division) => this.divisions.update({ ...division, isPublished }))
      }
      return this.getById(id, { role: 'SUPER_ADMIN' } as AuthUser)
    })
  }

  /** Քանի՞ սևագիր ֆակուլտետ և կուրս կա (վահանակի ցուցիչի համար)։ */
  countDrafts(): { faculties: number; cohorts: number } {
    const draftFaculties = this.faculties.findAll().filter((faculty) => !faculty.isPublished)
    const draftFacultyIds = new Set(draftFaculties.map((faculty) => faculty.id))
    return {
      faculties: draftFaculties.length,
      cohorts: this.cohorts
        .findAll()
        .filter((cohort) => !cohort.isPublished && !draftFacultyIds.has(cohort.facultyId)).length,
    }
  }

  /**
   * Ստեղծում է ֆակուլտետ՝ ստանդարտ 5 կուրսերով։ Նոր ֆակուլտետը սևագիր է.
   * այն չի երևում ոչ ուսանողների, ոչ էլ ֆակուլտետների ադմինների մոտ՝ մինչև հրապարակումը։
   */
  create(input: unknown, id: string = createId(), isPublished = false): FacultyWithCohorts {
    const data = this.parseInput(input)
    if (this.faculties.findByName(data.name)) throw conflict(`«${data.name}» ֆակուլտետն արդեն գոյություն ունի`)

    return this.db.transaction(() => {
      const faculty: Faculty = {
        id,
        ...data,
        deanSignature: data.deanSignature ?? '',
        sortOrder: this.faculties.nextSortOrder(),
        isPublished,
        createdAt: nowIso(),
      }
      this.faculties.insert(faculty)
      DEFAULT_YEAR_COHORTS.forEach((name, index) =>
        this.cohorts.insert({
          id: createId(),
          facultyId: faculty.id,
          divisionId: null,
          studyForm: 'full_time',
          name,
          kind: 'year',
          sortOrder: index + 1,
          isPublished,
          settings: createDefaultCohortSettings(),
        }),
      )
      return this.getById(faculty.id, { role: 'SUPER_ADMIN' } as AuthUser)
    })
  }

  update(id: string, input: unknown): FacultyWithCohorts {
    const faculty = this.faculties.findById(id)
    if (!faculty) throw notFound('Ֆակուլտետը չի գտնվել')
    const data = this.parseInput({ ...faculty, ...asRecord(input) })
    const sameName = this.faculties.findByName(data.name)
    if (sameName && sameName.id !== id) throw conflict(`«${data.name}» ֆակուլտետն արդեն գոյություն ունի`)
    this.faculties.update({ ...faculty, ...data })
    return this.getById(id, { role: 'SUPER_ADMIN' } as AuthUser)
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
      dean: optionalString(body.dean, 'Դեկան', 120) ?? '',
      deanSignature: readImageField(body.deanSignature, 'Դեկանի ստորագրությունը'),
    }
  }
}
