import { httpClient } from '../common/http/http-client'
import type { AuthSession, AuthUser, ChangePasswordPayload, LoginPayload } from './auth.types'

export const authRequests = {
  login: async (payload: LoginPayload): Promise<AuthSession> =>
    (await httpClient.post<AuthSession>('/auth/login', payload)).data,

  me: async (): Promise<AuthUser> => (await httpClient.get<AuthUser>('/auth/me')).data,

  changePassword: async (payload: ChangePasswordPayload): Promise<void> => {
    await httpClient.post('/auth/change-password', payload)
  },
}
