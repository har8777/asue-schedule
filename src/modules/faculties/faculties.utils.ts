import type { Cohort } from '../schedule/schedule.types'
import { sortCohorts } from '../schedule/schedule.utils'
import type { FacultyDivision, FacultyWithCohorts } from './faculties.types'

/** Ֆակուլտետի ներսում մեկ խումբ՝ հիմնական ցանկը կամ կցված բաժինը։ */
export interface CohortGroup {
  /** null՝ ֆակուլտետի հիմնական կուրսերը։ */
  division: FacultyDivision | null
  cohorts: Cohort[]
}

/**
 * Բաժանում է ֆակուլտետի կուրսերը խմբերի. նախ հիմնականները, հետո՝ կցված
 * բաժինները (օր.՝ «Հեռակա»)՝ իրենց վերնագրերով։ Դատարկ խմբերը բաց են թողնվում։
 */
export const groupCohorts = (faculty: FacultyWithCohorts): CohortGroup[] => {
  const divisions = [...(faculty.divisions ?? [])].sort((a, b) => a.sortOrder - b.sortOrder)
  const groups: CohortGroup[] = [
    { division: null, cohorts: sortCohorts(faculty.cohorts.filter((cohort) => !cohort.divisionId)) },
    ...divisions.map((division) => ({
      division,
      cohorts: sortCohorts(faculty.cohorts.filter((cohort) => cohort.divisionId === division.id)),
    })),
  ]
  return groups.filter((group) => group.cohorts.length > 0 || group.division !== null)
}
