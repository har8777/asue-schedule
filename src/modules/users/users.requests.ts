import { httpClient } from '../common/http/http-client'
import type { CreateUserPayload, UpdateUserPayload, User } from './users.types'

export const usersRequests = {
  list: async (): Promise<User[]> => (await httpClient.get<User[]>('/users')).data,

  create: async (payload: CreateUserPayload): Promise<User> => (await httpClient.post<User>('/users', payload)).data,

  update: async (id: string, payload: UpdateUserPayload): Promise<User> =>
    (await httpClient.patch<User>(`/users/${id}`, payload)).data,

  remove: async (id: string): Promise<void> => {
    await httpClient.delete(`/users/${id}`)
  },
}
