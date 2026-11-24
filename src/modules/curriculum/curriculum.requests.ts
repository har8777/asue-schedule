import { httpClient } from '../common/http/http-client'
import type {
  CohortPlanView,
  PlanContent,
  PlanImportMode,
  PlanImportResult,
  PlanImportRow,
  PublishPlanResult,
} from './curriculum.types'

export const curriculumRequests = {
  get: async (cohortId: string): Promise<CohortPlanView> =>
    (await httpClient.get<CohortPlanView>(`/cohorts/${cohortId}/plan`)).data,

  updateDraft: async (cohortId: string, payload: Partial<PlanContent>): Promise<CohortPlanView> =>
    (await httpClient.patch<CohortPlanView>(`/cohorts/${cohortId}/plan`, payload)).data,

  setSubject: async (cohortId: string, payload: { subject: string; hours: number }): Promise<CohortPlanView> =>
    (await httpClient.post<CohortPlanView>(`/cohorts/${cohortId}/plan/subjects`, payload)).data,

  removeSubject: async (cohortId: string, subject: string): Promise<CohortPlanView> =>
    (await httpClient.post<CohortPlanView>(`/cohorts/${cohortId}/plan/subjects/delete`, { subject })).data,

  publish: async (cohortId: string): Promise<PublishPlanResult> =>
    (await httpClient.post<PublishPlanResult>(`/cohorts/${cohortId}/plan/publish`)).data,

  discard: async (cohortId: string): Promise<CohortPlanView> =>
    (await httpClient.post<CohortPlanView>(`/cohorts/${cohortId}/plan/discard`)).data,

  /** Excel-ից ներմուծում՝ տողերը գրվում են սևագրում, մինչև «Հաստատել» չեն երևում։ */
  import: async (rows: PlanImportRow[], mode: PlanImportMode): Promise<PlanImportResult> =>
    (
      await httpClient.post<PlanImportResult>('/curriculum/import', {
        mode,
        rows: rows.map(({ line: _line, ...row }) => row),
      })
    ).data,
}
