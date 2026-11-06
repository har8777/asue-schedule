import type { SlotKey, SlotTime } from '../schedule-config/schedule-config.constants.ts'

/** Համալսարանի ընդհանուր կարգավորումներ, որոնք տեսանելի են բոլորին։ */
export interface PublicSettings {
  universityName: string
  semesterLabel: string
  /** Կիսամյակի առաջին երկուշաբթին (YYYY-MM-DD)՝ օրացույցի (.ics) արտահանման համար։ */
  semesterStartDate: string | null
  weeksCount: number
  slotTimes: Record<SlotKey, SlotTime>
}
