import type { SlotKey } from '../schedule/schedule.constants'

export interface SlotTime {
  start: string
  end: string
}

export interface PublicSettings {
  universityName: string
  semesterLabel: string
  semesterStartDate: string | null
  weeksCount: number
  slotTimes: Record<SlotKey, SlotTime>
}
