import { httpClient } from '../common/http/http-client'
import type { DayKey, SlotKey } from '../schedule/schedule.constants'
import type { ScheduleConflict } from '../schedule/schedule.types'
import type { FloorRooms, LessonPlacement, SearchResults } from './reports.types'

export const reportsRequests = {
  lecturerSchedule: async (name: string): Promise<LessonPlacement[]> =>
    (await httpClient.get<LessonPlacement[]>('/reports/lecturer-schedule', { params: { name } })).data,

  freeRooms: async (facultyId: string, day: DayKey, slot: SlotKey | 'all'): Promise<FloorRooms[]> =>
    (await httpClient.get<FloorRooms[]>('/reports/free-rooms', { params: { facultyId, day, slot } })).data,

  conflicts: async (facultyId?: string): Promise<ScheduleConflict[]> =>
    (await httpClient.get<ScheduleConflict[]>('/reports/conflicts', { params: facultyId ? { facultyId } : {} })).data,

  search: async (query: string): Promise<SearchResults> =>
    (await httpClient.get<SearchResults>('/reports/search', { params: { q: query } })).data,
}
