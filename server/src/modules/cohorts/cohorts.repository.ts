import type { Database } from '../../core/database/database.ts'
import { createDefaultCohortSettings } from './cohorts.constants.ts'
import type { Cohort, CohortKind, CohortSettings } from './cohorts.types.ts'

interface CohortRow {
  id: string
  faculty_id: string
  name: string
  kind: CohortKind
  sort_order: number
  settings: string
}

const parseSettings = (raw: string): CohortSettings => {
  try {
    return { ...createDefaultCohortSettings(), ...(JSON.parse(raw) as Partial<CohortSettings>) }
  } catch {
    return createDefaultCohortSettings()
  }
}

const toCohort = (row: CohortRow): Cohort => ({
  id: row.id,
  facultyId: row.faculty_id,
  name: row.name,
  kind: row.kind,
  sortOrder: row.sort_order,
  settings: parseSettings(row.settings),
})

export class CohortsRepository {
  private readonly db: Database

  constructor(db: Database) {
    this.db = db
  }

  findAll(): Cohort[] {
    return this.db.all<CohortRow>('SELECT * FROM cohorts ORDER BY sort_order, name').map(toCohort)
  }

  findByFaculty(facultyId: string): Cohort[] {
    return this.db
      .all<CohortRow>('SELECT * FROM cohorts WHERE faculty_id = ? ORDER BY sort_order, name', facultyId)
      .map(toCohort)
  }

  findById(id: string): Cohort | null {
    const row = this.db.get<CohortRow>('SELECT * FROM cohorts WHERE id = ?', id)
    return row ? toCohort(row) : null
  }

  findByName(facultyId: string, name: string): Cohort | null {
    const row = this.db.get<CohortRow>('SELECT * FROM cohorts WHERE faculty_id = ? AND name = ?', facultyId, name)
    return row ? toCohort(row) : null
  }

  nextSortOrder(facultyId: string): number {
    return (
      (this.db.get<{ value: number | null }>('SELECT MAX(sort_order) AS value FROM cohorts WHERE faculty_id = ?', facultyId)
        ?.value ?? 0) + 1
    )
  }

  insert(cohort: Cohort): void {
    this.db.run(
      'INSERT INTO cohorts (id, faculty_id, name, kind, sort_order, settings) VALUES (?, ?, ?, ?, ?, ?)',
      cohort.id,
      cohort.facultyId,
      cohort.name,
      cohort.kind,
      cohort.sortOrder,
      JSON.stringify(cohort.settings),
    )
  }

  update(cohort: Cohort): void {
    this.db.run(
      'UPDATE cohorts SET name = ?, kind = ?, sort_order = ?, settings = ? WHERE id = ?',
      cohort.name,
      cohort.kind,
      cohort.sortOrder,
      JSON.stringify(cohort.settings),
      cohort.id,
    )
  }

  delete(id: string): void {
    this.db.run('DELETE FROM cohorts WHERE id = ?', id)
  }
}
