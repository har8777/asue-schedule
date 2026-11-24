import type { DayKey, SlotKey } from '../schedule/schedule.constants'
import type { SlotTime } from '../settings/settings.types'

/** Ուսումնական պլանի տող՝ առարկա և կիսամյակային ժամաքանակ։ */
export interface PlanSubject {
  subject: string
  hours: number
}

export interface PlanContent {
  subjects: PlanSubject[]
  days: DayKey[]
  daySlotStart: Partial<Record<DayKey, SlotKey>>
  slotTimes: Partial<Record<SlotKey, SlotTime>>
}

/** Առարկայի օգտագործումը հոսքերում՝ հաստատված ժամաքանակի համեմատ։ */
export interface SubjectUsage {
  subject: string
  hours: number
  entries: number
  usedByStream: Record<string, number>
}

/**
 * Պլանի տեսքը։ `draft`-ը լրացվում է միայն գլխավոր ադմինի համար. մյուսները
 * տեսնում են բացառապես հաստատվածը (`published`)։
 */
export interface CohortPlanView {
  cohortId: string
  published: PlanContent | null
  draft: PlanContent | null
  hasPendingChanges: boolean
  publishedAt: string | null
  updatedAt: string
  usage: SubjectUsage[]
}

export interface PublishPlanResult extends CohortPlanView {
  removedLessons: number
}

export const EMPTY_PLAN_VIEW: CohortPlanView = {
  cohortId: '',
  published: null,
  draft: null,
  hasPendingChanges: false,
  publishedAt: null,
  updatedAt: '',
  usage: [],
}

/** Excel-ից ներմուծվող մեկ տող։ `cohortId`-ն օգտագործվում է, երբ կուրսը արդեն ընտրված է։ */
export interface PlanImportRow {
  cohortId?: string
  facultyName?: string
  cohortName?: string
  subject: string
  hours: number
  /** ֖այլի տողի համարը՝ սխալները ցույց տալու համար (չի ուղարկվում սերվեր)։ */
  line?: number
}

export type PlanImportMode = 'merge' | 'replace'

export interface PlanImportCohortResult {
  cohortId: string
  facultyName: string
  cohortName: string
  added: number
  updated: number
  unchanged: number
  removed: number
}

export interface PlanImportSkippedRow {
  row: number
  reason: string
}

export interface PlanImportResult {
  mode: PlanImportMode
  cohorts: PlanImportCohortResult[]
  skipped: PlanImportSkippedRow[]
  totalAdded: number
  totalUpdated: number
}
