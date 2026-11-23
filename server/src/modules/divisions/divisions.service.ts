import type { Database } from '../../core/database/database.ts'
import { badRequest, conflict, notFound } from '../../core/http/http-error.ts'
import { createId, nowIso } from '../../core/utils/id.ts'
import { asRecord, optionalString, requireString } from '../../core/validation/validators.ts'
import { createDefaultCohortSettings, DEFAULT_YEAR_COHORTS } from '../cohorts/cohorts.constants.ts'
import type { CohortsRepository } from '../cohorts/cohorts.repository.ts'
import type { FacultiesRepository } from '../faculties/faculties.repository.ts'
import type { DivisionsRepository } from './divisions.repository.ts'
import type { FacultyDivision } from './divisions.types.ts'

export class DivisionsService {
  private readonly db: Database
  private readonly divisions: DivisionsRepository
  private readonly faculties: FacultiesRepository
  private readonly cohorts: CohortsRepository

  constructor(
    db: Database,
    divisions: DivisionsRepository,
    faculties: FacultiesRepository,
    cohorts: CohortsRepository,
  ) {
    this.db = db
    this.divisions = divisions
    this.faculties = faculties
    this.cohorts = cohorts
  }

  getById(id: string): FacultyDivision {
    const division = this.divisions.findById(id)
    if (!division) throw notFound('Բաժինը չի գտնվել')
    return division
  }

  /**
   * Ստեղծում է ֆակուլտետին կցված բաժին։ Ըստ ցանկության՝ միանգամից 5 կուրսերով։
   * Բաժինը սևագիր է՝ մինչև հրապարակումը։
   */
  create(facultyId: string, input: unknown): FacultyDivision {
    const faculty = this.faculties.findById(facultyId)
    if (!faculty) throw notFound('Ֆակուլտետը չի գտնվել')
    const body = asRecord(input)
    const name = requireString(body.name, 'Անվանում', { max: 100 })
    if (this.divisions.findByName(facultyId, name)) throw conflict(`«${name}» անունով բաժին արդեն կա`)
    const building = optionalString(body.building, 'Մասնաշենք', 100) ?? ''
    const withCohorts = body.withDefaultCohorts !== false

    return this.db.transaction(() => {
      const division: FacultyDivision = {
        id: createId(),
        facultyId,
        name,
        building,
        sortOrder: this.divisions.nextSortOrder(facultyId),
        isPublished: false,
        createdAt: nowIso(),
      }
      this.divisions.insert(division)

      if (withCohorts) {
        // «Հեռակա» անվամբ բաժնի կուրսերը ստանում են հեռակա ուսուցման ձևաչափը
        const studyForm = /հեռակա/i.test(name) ? 'part_time' : 'full_time'
        DEFAULT_YEAR_COHORTS.forEach((cohortName, index) =>
          this.cohorts.insert({
            id: createId(),
            facultyId,
            divisionId: division.id,
            studyForm,
            name: `${name} ${cohortName}`,
            kind: 'year',
            sortOrder: 100 + index,
            isPublished: false,
            settings: createDefaultCohortSettings(),
          }),
        )
      }
      return division
    })
  }

  update(id: string, input: unknown): FacultyDivision {
    const division = this.getById(id)
    const body = asRecord(input)
    const name = body.name === undefined ? division.name : requireString(body.name, 'Անվանում', { max: 100 })
    const existing = this.divisions.findByName(division.facultyId, name)
    if (existing && existing.id !== id) throw conflict(`«${name}» անունով բաժին արդեն կա`)
    const building =
      body.building === undefined ? division.building : (optionalString(body.building, 'Մասնաշենք', 100) ?? '')
    const updated = { ...division, name, building }
    this.divisions.update(updated)
    return updated
  }

  setPublished(id: string, isPublished: boolean): FacultyDivision {
    const division = this.getById(id)
    if (isPublished && !this.faculties.findById(division.facultyId)?.isPublished) {
      throw badRequest('Նախ հրապարակեք մայր ֆակուլտետը')
    }
    return this.db.transaction(() => {
      const updated = { ...division, isPublished }
      this.divisions.update(updated)
      this.cohorts
        .findByFaculty(division.facultyId)
        .filter((cohort) => cohort.divisionId === id)
        .forEach((cohort) => this.cohorts.update({ ...cohort, isPublished }))
      return updated
    })
  }

  /** Ջնջում է բաժինը. նրա կուրսերը վերադառնում են ֆակուլտետի հիմնական ցանկ։ */
  delete(id: string): void {
    this.getById(id)
    this.divisions.delete(id)
  }
}
