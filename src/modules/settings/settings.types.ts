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
  /** Ստորագրության առաջին տողը՝ **բոլոր** դասացուցակների տակ։ Երկրորդը՝ դեկանը։ */
  partTimeHeadLabel: string
  partTimeHeadName: string
  /** Ստորագրությունների, կնիքի և լոգոյի պատկերները՝ data URL։ Դատարկը՝ չկա։ */
  logo: string
  approverSignature: string
  partTimeHeadSignature: string
  seal: string
  /** Ցուցադրե՞լ ստորագրություններն ու կնիքը։ Նախնականը՝ ոչ։ */
  showSignatures: boolean
  slotTimes: Record<SlotKey, SlotTime>
}
