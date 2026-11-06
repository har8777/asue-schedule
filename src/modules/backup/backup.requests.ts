import { httpClient } from '../common/http/http-client'

export interface RestoreResult {
  mode: 'full' | 'legacy'
  faculties: number
  cohorts: number
  lessons: number
}

export const backupRequests = {
  download: async (): Promise<Blob> => (await httpClient.get<Blob>('/backup', { responseType: 'blob' })).data,

  restore: async (data: unknown): Promise<RestoreResult> => (await httpClient.post<RestoreResult>('/backup/restore', data)).data,
}
