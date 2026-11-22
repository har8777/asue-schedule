import { useAsyncData } from '../../common/hooks/use-async-data'
import { curriculumRequests } from '../curriculum.requests'
import { EMPTY_PLAN_VIEW, type CohortPlanView } from '../curriculum.types'

/** Կուրսի ուսումնական պլանը։ Առանց cohortId-ի վերադարձնում է դատարկ պլան։ */
export const useCohortPlan = (cohortId: string) =>
  useAsyncData<CohortPlanView>(
    () => (cohortId ? curriculumRequests.get(cohortId) : Promise.resolve(EMPTY_PLAN_VIEW)),
    [cohortId],
  )
