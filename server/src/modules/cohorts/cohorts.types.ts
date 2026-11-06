import type { DayKey, SlotKey } from '../schedule-config/schedule-config.constants.ts'

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
}

/** Կուրս (օր.՝ «1-ին կուրս») կամ առանձին կրթական ծրագիր (օր.՝ «Սերվիս»)։ */
export interface Cohort {
  id: string
  facultyId: string
  name: string
  kind: CohortKind
  sortOrder: number
  settings: CohortSettings
}
