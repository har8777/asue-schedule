import type { Cohort } from '../cohorts/cohorts.types.ts'
import type { FacultyDivision } from '../divisions/divisions.types.ts'

export interface Faculty {
  id: string
  name: string
  shortName: string
  /** Մասնաշենք։ Լսարանների բախումը ստուգվում է նույն մասնաշենքի ներսում։ */
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
  /** Կցված բաժինները (օր.՝ «Հեռակա»)՝ քարտի ներսում առանձին խմբերով։ */
  divisions: FacultyDivision[]
}

export interface FacultyInput {
  name: string
  shortName: string
  building: string
  dean: string
}
