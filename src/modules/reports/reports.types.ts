import type { CatalogType } from '../catalog/catalog.types'
import type { DayKey, SlotKey } from '../schedule/schedule.constants'

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

export interface SearchResults {
  lessons: LessonPlacement[]
  catalog: { type: CatalogType; name: string; facultyId: string; facultyName: string }[]
}
