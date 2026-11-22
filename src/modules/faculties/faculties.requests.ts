import { httpClient } from '../common/http/http-client'
import type { DivisionPayload, FacultyDivision, FacultyPayload, FacultyWithCohorts } from './faculties.types'

export const facultiesRequests = {
  list: async (): Promise<FacultyWithCohorts[]> => (await httpClient.get<FacultyWithCohorts[]>('/faculties')).data,

  get: async (id: string): Promise<FacultyWithCohorts> =>
    (await httpClient.get<FacultyWithCohorts>(`/faculties/${id}`)).data,

  create: async (payload: FacultyPayload): Promise<FacultyWithCohorts> =>
    (await httpClient.post<FacultyWithCohorts>('/faculties', payload)).data,

  update: async (id: string, payload: FacultyPayload): Promise<FacultyWithCohorts> =>
    (await httpClient.patch<FacultyWithCohorts>(`/faculties/${id}`, payload)).data,

  remove: async (id: string): Promise<void> => {
    await httpClient.delete(`/faculties/${id}`)
  },

  clearLessons: async (id: string): Promise<{ deleted: number }> =>
    (await httpClient.delete<{ deleted: number }>(`/faculties/${id}/lessons`)).data,

  clearAllLessons: async (): Promise<{ deleted: number }> =>
    (await httpClient.delete<{ deleted: number }>('/lessons')).data,

  /** Հրապարակում է ֆակուլտետը իր կուրսերով (կամ հետ բերում սևագրի)։ */
  setPublished: async (id: string, isPublished: boolean): Promise<FacultyWithCohorts> =>
    (await httpClient.post<FacultyWithCohorts>(`/faculties/${id}/${isPublished ? 'publish' : 'unpublish'}`)).data,

  draftsCount: async (): Promise<{ faculties: number; cohorts: number }> =>
    (await httpClient.get<{ faculties: number; cohorts: number }>('/faculties/drafts/count')).data,

  /** Կցում է նոր բաժին գոյություն ունեցող ֆակուլտետին (օր.՝ «Հեռակա»)։ */
  createDivision: async (facultyId: string, payload: DivisionPayload): Promise<FacultyDivision> =>
    (await httpClient.post<FacultyDivision>(`/faculties/${facultyId}/divisions`, payload)).data,

  updateDivision: async (id: string, payload: Partial<DivisionPayload>): Promise<FacultyDivision> =>
    (await httpClient.patch<FacultyDivision>(`/divisions/${id}`, payload)).data,

  setDivisionPublished: async (id: string, isPublished: boolean): Promise<FacultyDivision> =>
    (await httpClient.post<FacultyDivision>(`/divisions/${id}/${isPublished ? 'publish' : 'unpublish'}`)).data,

  removeDivision: async (id: string): Promise<void> => {
    await httpClient.delete(`/divisions/${id}`)
  },
}
