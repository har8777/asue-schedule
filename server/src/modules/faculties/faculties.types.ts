import type { Cohort } from '../cohorts/cohorts.types.ts'

export interface Faculty {
  id: string
  name: string
  shortName: string
  /** Մասնաշենք։ Լսարանների բախումը ստուգվում է նույն մասնաշենքի ներսում։ */
  building: string
  sortOrder: number
  createdAt: string
}

export interface FacultyWithCohorts extends Faculty {
  cohorts: Cohort[]
}

export interface FacultyInput {
  name: string
  shortName: string
  building: string
}
