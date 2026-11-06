import { httpClient } from '../common/http/http-client'
import type { ChangeLogEntry } from './change-log.types'

export const changeLogRequests = {
  list: async (params: { facultyId?: string; limit?: number } = {}): Promise<ChangeLogEntry[]> =>
    (await httpClient.get<ChangeLogEntry[]>('/change-log', { params })).data,

  clear: async (): Promise<void> => {
    await httpClient.delete('/change-log')
  },
}
