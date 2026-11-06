import type { CatalogType } from '../catalog/catalog.types.ts'
import type { DayKey, SlotKey } from '../schedule-config/schedule-config.constants.ts'

export interface LessonPlacement {
  day: DayKey
  slot: SlotKey
  partIndex: number
  partsCount: number
  subject: string
  lecturers: string[]
  rooms: string[]
  facultyId: string
  facultyName: string
  cohortId: string
  cohortName: string
  streamId: string
  streamName: string
}

export interface RoomStatus {
  name: string
  isFree: boolean
  occupiedBy: LessonPlacement[]
}

export interface FloorRooms {
  floor: string
  rooms: RoomStatus[]
}

export interface CatalogSearchResult {
  type: CatalogType
  name: string
  facultyId: string
  facultyName: string
}

export interface SearchResults {
  lessons: LessonPlacement[]
  catalog: CatalogSearchResult[]
}
