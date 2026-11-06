import { httpClient } from '../common/http/http-client'
import type {
  Cohort,
  CohortKind,
  CohortSchedule,
  CohortSettings,
  LessonKey,
  SaveLessonPayload,
  SaveLessonResult,
  ScheduleConflict,
  UpdateCohortResult,
} from './schedule.types'

export const scheduleRequests = {
  getSchedule: async (cohortId: string): Promise<CohortSchedule> =>
    (await httpClient.get<CohortSchedule>(`/cohorts/${cohortId}/schedule`)).data,

  checkConflicts: async (cohortId: string, payload: SaveLessonPayload): Promise<ScheduleConflict[]> =>
    (await httpClient.post<ScheduleConflict[]>(`/cohorts/${cohortId}/lessons/check`, payload)).data,

  saveLesson: async (cohortId: string, payload: SaveLessonPayload): Promise<SaveLessonResult> =>
    (await httpClient.put<SaveLessonResult>(`/cohorts/${cohortId}/lessons`, payload)).data,

  deleteLesson: async (cohortId: string, key: LessonKey): Promise<void> => {
    await httpClient.post(`/cohorts/${cohortId}/lessons/delete`, key)
  },

  clearCohort: async (cohortId: string): Promise<{ deleted: number }> =>
    (await httpClient.delete<{ deleted: number }>(`/cohorts/${cohortId}/lessons`)).data,

  createCohort: async (facultyId: string, payload: { name: string; kind: CohortKind }): Promise<Cohort> =>
    (await httpClient.post<Cohort>(`/faculties/${facultyId}/cohorts`, payload)).data,

  updateCohort: async (cohortId: string, payload: { name?: string; settings?: CohortSettings }): Promise<UpdateCohortResult> =>
    (await httpClient.patch<UpdateCohortResult>(`/cohorts/${cohortId}`, payload)).data,

  deleteCohort: async (cohortId: string): Promise<void> => {
    await httpClient.delete(`/cohorts/${cohortId}`)
  },
}
