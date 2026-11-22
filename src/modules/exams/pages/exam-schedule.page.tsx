import { FileCheck2 } from 'lucide-react'
import { useParams } from 'react-router-dom'
import { APP_ROUTES } from '../../../app/app.routes'
import { EmptyState, ErrorState, PageLoader } from '../../common/components/feedback.component'
import { useDocumentTitle } from '../../common/hooks/use-document-title'
import { useFaculty } from '../../faculties/hooks/use-faculties'
import { ScheduleHeader } from '../../schedule/components/schedule-header.component'
import { ScheduleSectionTabs } from '../../schedule/components/schedule-section-tabs.component'
import { useCohortSchedule } from '../../schedule/hooks/use-cohort-schedule'

interface ExamSchedulePageProps {
  /** Ադմինի բաժնում ներդիրները տանում են խմբագրման էջերին։ */
  isAdmin?: boolean
}

/**
 * Քննագրաֆիկ։ Առանձին պատուհան է դասացուցակի կողքին. բովանդակությունը
 * կավելացվի հաջորդ փուլում, կառուցվածքն արդեն պատրաստ է։
 */
export const ExamSchedulePage = ({ isAdmin = false }: ExamSchedulePageProps) => {
  const { cohortId } = useParams<{ cohortId: string }>()
  const { schedule, error, isLoading, reload } = useCohortSchedule(cohortId)
  const { data: faculty } = useFaculty(schedule?.faculty.id)

  useDocumentTitle(schedule ? `Քննագրաֆիկ — ${schedule.cohort.name}` : 'Քննագրաֆիկ')

  if (isLoading && !schedule) return <PageLoader />
  if (error) return <ErrorState message={error} onRetry={reload} />
  if (!schedule) return null

  const buildLink = isAdmin ? APP_ROUTES.admin.examsEditor : APP_ROUTES.exams

  return (
    <>
      <ScheduleSectionTabs
        scheduleTo={isAdmin ? APP_ROUTES.admin.editor(schedule.cohort.id) : APP_ROUTES.schedule(schedule.cohort.id)}
        examsTo={buildLink(schedule.cohort.id)}
      />
      <ScheduleHeader
        facultyName={schedule.faculty.name}
        cohortName={schedule.cohort.name}
        cohorts={faculty?.cohorts ?? []}
        buildLink={buildLink}
      />
      <EmptyState
        icon={<FileCheck2 className="size-10" />}
        title="Քննագրաֆիկը դեռ կազմված չէ"
        description="Քննությունների գրաֆիկը կավելացվի առանձին։ Դասացուցակը հասանելի է հարևան ներդիրում։"
      />
    </>
  )
}
