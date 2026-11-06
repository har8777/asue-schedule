import { httpClient } from '../common/http/http-client'
import type { PublicSettings } from './settings.types'

export const settingsRequests = {
  get: async (): Promise<PublicSettings> => (await httpClient.get<PublicSettings>('/settings')).data,

  update: async (payload: Partial<PublicSettings>): Promise<PublicSettings> =>
    (await httpClient.put<PublicSettings>('/settings', payload)).data,
}
