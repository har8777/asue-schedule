import type { Cohort } from '../schedule/schedule.types'

/** Ֆակուլտետին կցված բաժին՝ օր.՝ «Հեռակա»։ Երևում է մայր ֆակուլտետի ներսում։ */
export interface FacultyDivision {
  id: string
  facultyId: string
  name: string
  /** Դատարկ՝ մայր ֆակուլտետի լսարանները, լրացված՝ սեփական մասնաշենք։ */
  building: string
  sortOrder: number
  isPublished: boolean
  createdAt: string
}

export interface Faculty {
  id: string
  name: string
  shortName: string
  building: string
  /** Դեկանի անուն/ազգանուն։ */
  dean: string
  sortOrder: number
  /** Սևագիր ֆակուլտետը տեսնում է միայն գլխավոր ադմինը։ */
  isPublished: boolean
  createdAt: string
}

export interface FacultyWithCohorts extends Faculty {
  cohorts: Cohort[]
  divisions: FacultyDivision[]
}

export interface FacultyPayload {
  name: string
  shortName: string
  building: string
  dean: string
}

export interface DivisionPayload {
  name: string
  /** Դատարկ՝ մայր ֆակուլտետի լսարանները։ */
  building: string
}
