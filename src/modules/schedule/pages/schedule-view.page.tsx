import { CalendarDays, Pencil } from 'lucide-react'
import { useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { APP_ROUTES } from '../../../app/app.routes'
import { useAuth } from '../../auth/auth.context'
import { ButtonLink } from '../../common/components/button.component'
import { EmptyState, ErrorState, PageLoader } from '../../common/components/feedback.component'
import { useDocumentTitle } from '../../common/hooks/use-document-title'
import { localStore, STORAGE_KEYS } from '../../common/storage/local-storage'
import { useFaculty } from '../../faculties/hooks/use-faculties'
import { ScheduleBoard } from '../components/schedule-board.component'
import { ScheduleExportMenu } from '../components/schedule-export-menu.component'
import { ScheduleHeader } from '../components/schedule-header.component'
import { useCohortSchedule } from '../hooks/use-cohort-schedule'

/** Հանրային դասացուցակ՝ ուսանողների համար (առանց մուտքի)։ */
export const ScheduleViewPage = () => {
  const { cohortId } = useParams<{ cohortId: string }>()
  const { canEditFaculty } = useAuth()
  const { schedule, lessonMap, error, isLoading, reload } = useCohortSchedule(cohortId)
  const { data: faculty } = useFaculty(schedule?.faculty.id)

  useDocumentTitle(schedule ? `${schedule.cohort.name} — ${schedule.faculty.shortName}` : null)

  useEffect(() => {
    if (cohortId && schedule) localStore.set(STORAGE_KEYS.LAST_COHORT, { cohortId, label: `${schedule.faculty.shortName} • ${schedule.cohort.name}` })
  }, [cohortId, schedule])

  if (isLoading && !schedule) return <PageLoader />
  if (error) return <ErrorState message={error} onRetry={reload} />
  if (!schedule) return null

  return (
    <>
      <ScheduleHeader
        facultyName={schedule.faculty.name}
        cohortName={schedule.cohort.name}
        cohorts={faculty?.cohorts ?? []}
        buildLink={APP_ROUTES.schedule}
        actions={
          <>
            {canEditFaculty(schedule.faculty.id) && (
              <ButtonLink to={APP_ROUTES.admin.editor(schedule.cohort.id)} icon={<Pencil className="size-4" />}>
                Խմբագրել
              </ButtonLink>
            )}
            <ScheduleExportMenu schedule={schedule} />
          </>
        }
      />
      {schedule.lessons.length === 0 ? (
        <EmptyState
          icon={<CalendarDays className="size-10" />}
          title="Դասացուցակը դեռ լրացված չէ"
          description="Այս կուրսի համար դասեր դեռ չեն ավելացվել։ Փորձեք ավելի ուշ։"
        />
      ) : (
        <ScheduleBoard
          cohort={schedule.cohort}
          lessons={lessonMap}
          title={`${schedule.faculty.name} — ${schedule.cohort.name}`}
        />
      )}
    </>
  )
}
