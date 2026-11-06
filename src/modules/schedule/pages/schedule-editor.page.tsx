import { Eye, Redo2, SlidersHorizontal, Undo2 } from 'lucide-react'
import { useCallback, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { APP_ROUTES } from '../../../app/app.routes'
import { useAuth } from '../../auth/auth.context'
import { catalogRequests } from '../../catalog/catalog.requests'
import { EMPTY_CATALOG } from '../../catalog/catalog.types'
import { Button, ButtonLink } from '../../common/components/button.component'
import { ErrorState, PageLoader } from '../../common/components/feedback.component'
import { useToast } from '../../common/components/toast.context'
import { useAsyncData } from '../../common/hooks/use-async-data'
import { useDocumentTitle } from '../../common/hooks/use-document-title'
import { useHotkeys } from '../../common/hooks/use-hotkeys'
import { getErrorMessage } from '../../common/http/http-error'
import { ForbiddenPage } from '../../common/pages/status.page'
import { useFaculty } from '../../faculties/hooks/use-faculties'
import { CohortSettingsModal } from '../components/cohort-settings-modal.component'
import { LessonEditorModal, type LessonEditTarget } from '../components/lesson-editor-modal.component'
import { ScheduleBoard } from '../components/schedule-board.component'
import { ScheduleExportMenu } from '../components/schedule-export-menu.component'
import { ScheduleHeader } from '../components/schedule-header.component'
import { useCohortSchedule } from '../hooks/use-cohort-schedule'
import { useScheduleHistory } from '../hooks/use-schedule-history'
import { scheduleRequests } from '../schedule.requests'
import type { Lesson, LessonKey, LessonPart } from '../schedule.types'

/** Դասացուցակի խմբագրիչ. ադմինը՝ միայն իր ֆակուլտետի, գլխավոր ադմինը՝ բոլորի։ */
export const ScheduleEditorPage = () => {
  const { cohortId } = useParams<{ cohortId: string }>()
  const navigate = useNavigate()
  const toast = useToast()
  const { canEditFaculty } = useAuth()
  const { schedule, lessonMap, error, isLoading, reload, applyLesson, applyCohort } = useCohortSchedule(cohortId)
  const facultyId = schedule?.faculty.id
  const { data: faculty, reload: reloadFaculty } = useFaculty(facultyId)
  const { data: catalog, reload: reloadCatalog } = useAsyncData(
    () => (facultyId ? catalogRequests.getForFaculty(facultyId) : Promise.resolve(EMPTY_CATALOG)),
    [facultyId],
  )
  const [editTarget, setEditTarget] = useState<LessonEditTarget | null>(null)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)

  useDocumentTitle(schedule ? `Խմբագրում՝ ${schedule.cohort.name}` : 'Խմբագրում')

  const applyChange = useCallback(
    async (key: LessonKey, parts: LessonPart[] | null) => {
      if (!cohortId) return
      try {
        if (parts) {
          const result = await scheduleRequests.saveLesson(cohortId, { ...key, parts, force: true })
          applyLesson(key, result.lesson)
        } else {
          await scheduleRequests.deleteLesson(cohortId, key)
          applyLesson(key, null)
        }
      } catch (changeError) {
        toast.error(getErrorMessage(changeError))
        throw changeError
      }
    },
    [cohortId, applyLesson, toast],
  )

  const history = useScheduleHistory(applyChange)
  const runUndo = () => void history.undo().catch(() => undefined)
  const runRedo = () => void history.redo().catch(() => undefined)
  useHotkeys({ 'mod+z': runUndo, 'mod+shift+z': runRedo, 'mod+y': runRedo }, !editTarget && !isSettingsOpen)

  const handleLessonChanged = (key: LessonKey, before: LessonPart[] | null, after: Lesson | null) => {
    applyLesson(key, after)
    history.record({ key, before, after: after?.parts ?? null })
    void reloadCatalog()
  }

  if (isLoading && !schedule) return <PageLoader />
  if (error) return <ErrorState message={error} onRetry={reload} />
  if (!schedule) return null
  if (!canEditFaculty(schedule.faculty.id)) return <ForbiddenPage />

  return (
    <>
      <ScheduleHeader
        facultyName={schedule.faculty.name}
        cohortName={schedule.cohort.name}
        cohorts={faculty?.cohorts ?? []}
        buildLink={APP_ROUTES.admin.editor}
        actions={
          <>
            <div className="flex items-center rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
              <Button variant="ghost" size="icon" onClick={runUndo} disabled={!history.canUndo || history.isBusy} title="Հետարկել (Ctrl+Z)" aria-label="Հետարկել">
                <Undo2 className="size-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={runRedo} disabled={!history.canRedo || history.isBusy} title="Կրկնել (Ctrl+Y)" aria-label="Կրկնել">
                <Redo2 className="size-4" />
              </Button>
            </div>
            <Button variant="secondary" icon={<SlidersHorizontal className="size-4" />} onClick={() => setIsSettingsOpen(true)}>
              Կարգավորումներ
            </Button>
            <ButtonLink to={APP_ROUTES.schedule(schedule.cohort.id)} variant="secondary" icon={<Eye className="size-4" />}>
              Դիտել
            </ButtonLink>
            <ScheduleExportMenu schedule={schedule} />
          </>
        }
      />

      <p className="print-hidden mb-3 text-xs text-slate-500">
        Սեղմեք վանդակի վրա՝ դաս ավելացնելու կամ խմբագրելու համար։ Փոփոխությունները պահպանվում են անմիջապես։
      </p>

      <ScheduleBoard
        cohort={schedule.cohort}
        lessons={lessonMap}
        title={`${schedule.faculty.name} — ${schedule.cohort.name}`}
        isEditable
        onCellClick={(key, lesson) => setEditTarget({ key, lesson })}
      />

      <LessonEditorModal
        cohort={schedule.cohort}
        catalog={catalog ?? EMPTY_CATALOG}
        target={editTarget}
        onClose={() => setEditTarget(null)}
        onChanged={handleLessonChanged}
      />

      <CohortSettingsModal
        isOpen={isSettingsOpen}
        cohort={schedule.cohort}
        lessons={schedule.lessons}
        onClose={() => setIsSettingsOpen(false)}
        onSaved={(cohort) => {
          applyCohort(cohort)
          history.clear()
          void reload()
          void reloadFaculty()
        }}
        onCleared={() => {
          history.clear()
          void reload()
        }}
        onDeleted={() => navigate(APP_ROUTES.admin.dashboard, { replace: true })}
      />
    </>
  )
}
