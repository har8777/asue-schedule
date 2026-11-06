import { useCallback, useMemo } from 'react'
import { useAsyncData } from '../../common/hooks/use-async-data'
import { scheduleRequests } from '../schedule.requests'
import type { Cohort, CohortSchedule, Lesson, LessonKey } from '../schedule.types'
import { indexLessons, lessonKeyId } from '../schedule.utils'

/** Բեռնում է կուրսի դասացուցակը և թույլ է տալիս տեղայնորեն թարմացնել վանդակները առանց վերաբեռնման։ */
export const useCohortSchedule = (cohortId: string | undefined) => {
  const { data, error, isLoading, reload, setData } = useAsyncData<CohortSchedule | null>(
    () => (cohortId ? scheduleRequests.getSchedule(cohortId) : Promise.resolve(null)),
    [cohortId],
  )

  const lessonMap = useMemo(() => indexLessons(data?.lessons ?? []), [data])

  const applyLesson = useCallback(
    (key: LessonKey, lesson: Lesson | null) => {
      setData((current) => {
        if (!current) return current
        const others = current.lessons.filter((item) => lessonKeyId(item) !== lessonKeyId(key))
        return { ...current, lessons: lesson ? [...others, lesson] : others }
      })
    },
    [setData],
  )

  const applyCohort = useCallback(
    (cohort: Cohort) => setData((current) => (current ? { ...current, cohort } : current)),
    [setData],
  )

  return { schedule: data, lessonMap, error, isLoading, reload, applyLesson, applyCohort }
}
