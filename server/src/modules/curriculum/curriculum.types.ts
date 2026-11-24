import type { DayKey, SlotKey, SlotTime } from '../schedule-config/schedule-config.constants.ts'

/** Ուսումնական պլանի տող՝ առարկա և կիսամյակային ժամաքանակ։ */
export interface PlanSubject {
  subject: string
  hours: number
}

/**
 * Կուրսի ուսումնական պլանը մեկ կիսամյակի համար՝ առարկաները ժամաքանակով և
 * աղյուսակի կառուցվածքը (շաբաթվա օրեր, օրվա առաջին դասաժամ, դասաժամերի ժամերը)։
 */
export interface PlanContent {
  subjects: PlanSubject[]
  days: DayKey[]
  daySlotStart: Partial<Record<DayKey, SlotKey>>
  /** Միայն այս կուրսի համար՝ ընդհանուր կարգավորումները փոխարինող ժամեր։ */
  slotTimes: Partial<Record<SlotKey, SlotTime>>
}

/**
 * Պլանը պահվում է երկու վիճակով. սևագիր (միայն super admin-ը տեսնում է) և
 * հաստատված (տեսնում են ֆակուլտետի ադմինները և ուսանողները)։ Առանց հաստատման
 * super admin-ի ստեղծածը ոչ մի այլ տեղ չի երևում։
 */
export interface CohortPlan {
  cohortId: string
  draft: PlanContent
  published: PlanContent | null
  updatedAt: string
  publishedAt: string | null
  publishedBy: string | null
}

/** Առարկայի օգտագործումը հոսքերում՝ քվոտայի ցուցադրման համար։ */
export interface SubjectUsage {
  subject: string
  hours: number
  /** Շաբաթական մուտքերի սահմանաչափը (ժամաքանակ / 32)։ */
  entries: number
  /** Օգտագործված մուտքերը ըստ հոսքերի (stream id → մուտք)։ */
  usedByStream: Record<string, number>
}

/** Super admin-ի համար՝ սևագիրն ու հաստատվածը, մնացածի համար՝ միայն հաստատվածը։ */
export interface CohortPlanView {
  cohortId: string
  /** Գործող (հաստատված) պլանը։ null՝ եթե դեռ հաստատված չէ։ */
  published: PlanContent | null
  /** Սևագիրը՝ միայն super admin-ի համար։ */
  draft: PlanContent | null
  hasPendingChanges: boolean
  publishedAt: string | null
  updatedAt: string
  usage: SubjectUsage[]
}

/** Excel-ից ներմուծվող մեկ տող՝ ֆակուլտետ, կուրս, դասընթաց և կիսամյակային ժամաքանակ։ */
export interface PlanImportRow {
  facultyName: string
  cohortName: string
  subject: string
  hours: number
}

/** Ներմուծման ռեժիմ. merge՝ ավելացնում է եղածին, replace՝ փոխարինում է կուրսի ցուցակը։ */
export const PLAN_IMPORT_MODES = ['merge', 'replace'] as const
export type PlanImportMode = (typeof PLAN_IMPORT_MODES)[number]

/** Ներմուծման արդյունքը մեկ կուրսի համար։ */
export interface PlanImportCohortResult {
  cohortId: string
  facultyName: string
  cohortName: string
  /** Նոր ավելացված դասընթացներ։ */
  added: number
  /** Արդեն եղած դասընթացներ, որոնց ժամաքանակը փոխվեց։ */
  updated: number
  /** Ֆայլում կրկնված կամ նույն ժամաքանակով տողեր։ */
  unchanged: number
  /** replace ռեժիմում՝ հանված դասընթացներ։ */
  removed: number
}

/** Տող, որը չի կարողացել ներմուծվել՝ ֆայլի տողի համարով և պատճառով։ */
export interface PlanImportSkippedRow {
  /** Տողի համարը ֆայլում (վերնագրի տողը՝ 1)։ */
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
