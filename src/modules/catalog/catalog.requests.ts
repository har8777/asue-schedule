import { httpClient } from '../common/http/http-client'
import type { CatalogImportRow, CatalogType, FacultyCatalog } from './catalog.types'

export const catalogRequests = {
  getForFaculty: async (facultyId: string): Promise<FacultyCatalog> =>
    (await httpClient.get<FacultyCatalog>(`/faculties/${facultyId}/catalog`)).data,

  getAllLecturers: async (): Promise<string[]> => (await httpClient.get<string[]>('/catalog/lecturers')).data,

  add: async (facultyId: string, payload: { type: CatalogType; name: string; floor?: string }): Promise<FacultyCatalog> =>
    (await httpClient.post<FacultyCatalog>(`/faculties/${facultyId}/catalog`, payload)).data,

  remove: async (itemId: string): Promise<void> => {
    await httpClient.delete(`/catalog/${itemId}`)
  },

  import: async (rows: CatalogImportRow[]): Promise<{ added: number; skipped: number }> =>
    (await httpClient.post<{ added: number; skipped: number }>('/catalog/import', { rows })).data,
}
