import type { Cohort } from '../schedule/schedule.types'

export interface Faculty {
  id: string
  name: string
  shortName: string
  building: string
  sortOrder: number
  createdAt: string
}

export interface FacultyWithCohorts extends Faculty {
  cohorts: Cohort[]
}

export interface FacultyPayload {
  name: string
  shortName: string
  building: string
}
