import { useEffect, useState } from 'react'
import { scheduleRequests } from '../schedule.requests'
import type { LessonKey, LessonPart, ScheduleConflict } from '../schedule.types'
import { isLessonEmpty } from '../schedule.utils'

const DEBOUNCE_MS = 450

/** Ստուգում է բախումները մուտքագրման ընթացքում (debounce-ով), որպեսզի ադմինը տեսնի նախքան պահպանելը։ */
export const useConflictCheck = (cohortId: string, key: LessonKey | null, parts: LessonPart[]) => {
  const [conflicts, setConflicts] = useState<ScheduleConflict[]>([])
  const [isChecking, setIsChecking] = useState(false)
  const serialized = JSON.stringify(parts)

  useEffect(() => {
    const currentParts = JSON.parse(serialized) as LessonPart[]
    if (!key || isLessonEmpty(currentParts)) {
      setConflicts([])
      return
    }
    let isCancelled = false
    setIsChecking(true)
    const timer = setTimeout(() => {
      scheduleRequests
        .checkConflicts(cohortId, { ...key, parts: currentParts })
        .then((result) => {
          if (!isCancelled) setConflicts(result)
        })
        .catch(() => undefined)
        .finally(() => {
          if (!isCancelled) setIsChecking(false)
        })
    }, DEBOUNCE_MS)
    return () => {
      isCancelled = true
      clearTimeout(timer)
    }
  }, [cohortId, key, serialized])

  return { conflicts, isChecking }
}
