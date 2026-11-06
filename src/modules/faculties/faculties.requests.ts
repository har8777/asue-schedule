import { httpClient } from '../common/http/http-client'
import type { FacultyPayload, FacultyWithCohorts } from './faculties.types'

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
}
