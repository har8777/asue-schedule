import type { Database } from '../../core/database/database.ts'
import type { CohortPlan, PlanContent } from './curriculum.types.ts'

interface PlanRow {
  cohort_id: string
  draft: string
  published: string | null
  updated_at: string
  published_at: string | null
  published_by: string | null
}

export const emptyPlanContent = (): PlanContent => ({ subjects: [], days: [], daySlotStart: {}, slotTimes: {} })

const parseContent = (raw: string | null): PlanContent | null => {
  if (!raw) return null
  try {
    return { ...emptyPlanContent(), ...(JSON.parse(raw) as Partial<PlanContent>) }
  } catch {
    return null
  }
}

const toPlan = (row: PlanRow): CohortPlan => ({
  cohortId: row.cohort_id,
  draft: parseContent(row.draft) ?? emptyPlanContent(),
  published: parseContent(row.published),
  updatedAt: row.updated_at,
  publishedAt: row.published_at,
  publishedBy: row.published_by,
})

export class CurriculumRepository {
  private readonly db: Database

  constructor(db: Database) {
    this.db = db
  }

  findByCohort(cohortId: string): CohortPlan | null {
    const row = this.db.get<PlanRow>('SELECT * FROM cohort_plans WHERE cohort_id = ?', cohortId)
    return row ? toPlan(row) : null
  }

  findAll(): CohortPlan[] {
    return this.db.all<PlanRow>('SELECT * FROM cohort_plans').map(toPlan)
  }

  save(plan: CohortPlan): void {
    this.db.run(
      `INSERT INTO cohort_plans (cohort_id, draft, published, updated_at, published_at, published_by)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT (cohort_id) DO UPDATE SET
         draft = excluded.draft,
         published = excluded.published,
         updated_at = excluded.updated_at,
         published_at = excluded.published_at,
         published_by = excluded.published_by`,
      plan.cohortId,
      JSON.stringify(plan.draft),
      plan.published ? JSON.stringify(plan.published) : null,
      plan.updatedAt,
      plan.publishedAt,
      plan.publishedBy,
    )
  }

  delete(cohortId: string): void {
    this.db.run('DELETE FROM cohort_plans WHERE cohort_id = ?', cohortId)
  }
}
