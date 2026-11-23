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
  /** Ուսումնական տարին, օր.՝ «2026-2027»։ */
  academicYear: string
  approverTitle: string
  approverName: string
  approvalDate: string
  academicHeadLabel: string
  academicHeadName: string
  /** Հեռակա ուսուցման դասացուցակի ստորագրության տողը։ */
  partTimeHeadLabel: string
  partTimeHeadName: string
  slotTimes: Record<SlotKey, SlotTime>
}
