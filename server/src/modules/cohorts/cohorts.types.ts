import type { DayKey, SlotKey, SlotTime } from '../schedule-config/schedule-config.constants.ts'

export type CohortKind = 'year' | 'program'

export interface CohortStream {
  id: string
  name: string
}

/** Աղյուսակի կառուցվածքը՝ հոսքեր, օրեր և յուրաքանչյուր օրվա առաջին դասաժամը։ */
export interface CohortSettings {
  streams: CohortStream[]
  days: DayKey[]
  daySlotStart: Partial<Record<DayKey, SlotKey>>
  /** Ուսումնական պլանով հաստատված ժամերը՝ ընդհանուր կարգավորումները փոխարինող։ */
  slotTimes?: Partial<Record<SlotKey, SlotTime>>
}

/** Կուրս (օր.՝ «1-ին կուրս») կամ առանձին կրթական ծրագիր (օր.՝ «Սերվիս»)։ */
/** Ուսուցման ձևը. առկա (շաբաթական ձևաչափ) կամ հեռակա (շաբաթներով, ամսաթվերով)։ */
export type StudyForm = 'full_time' | 'part_time'

export interface Cohort {
  id: string
  facultyId: string
  /** Կցված բաժինը (օր.՝ «Հեռակա»)։ null՝ ֆակուլտետի հիմնական ցանկում։ */
  divisionId: string | null
  name: string
  kind: CohortKind
  sortOrder: number
  studyForm: StudyForm
  /** Սևագիր կուրսը տեսնում է միայն գլխավոր ադմինը։ */
  isPublished: boolean
  settings: CohortSettings
}
