import { CalendarClock, CheckCircle2, ClipboardList, FileSpreadsheet, Undo2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../../auth/auth.context'
import { Button } from '../../common/components/button.component'
import { useConfirm } from '../../common/components/confirm.context'
import { ErrorState, PageLoader } from '../../common/components/feedback.component'
import { SegmentedControl, SelectInput } from '../../common/components/form-controls.component'
import { Card, PageHeader } from '../../common/components/page-header.component'
import { useToast } from '../../common/components/toast.context'
import { useDocumentTitle } from '../../common/hooks/use-document-title'
import { getErrorMessage } from '../../common/http/http-error'
import { catalogRequests } from '../../catalog/catalog.requests'
import { useAsyncData } from '../../common/hooks/use-async-data'
import { useFaculties } from '../../faculties/hooks/use-faculties'
import { sortCohorts } from '../../schedule/schedule.utils'
import { cohortKey, PlanImportModal } from '../components/plan-import-modal.component'
import { PlanScheduleGrid } from '../components/plan-schedule-grid.component'
import { PlanSubjectsEditor } from '../components/plan-subjects-editor.component'
import { curriculumRequests } from '../curriculum.requests'
import type { PlanContent } from '../curriculum.types'
import { useCohortPlan } from '../hooks/use-cohort-plan'

type PlanTab = 'subjects' | 'grid'

/**
 * Ուսումնական պլան. գլխավոր ադմինը սահմանում է կուրսի առարկաները ժամաքանակով,
 * շաբաթվա օրերը և ժամերը։ Փոփոխությունները մնում են սևագիր՝ մինչև հաստատումը,
 * և մինչ այդ չեն երևում ոչ ֆակուլտետների ադմինների, ոչ էլ ուսանողների մոտ։
 */
export const CurriculumPage = () => {
  useDocumentTitle('Ուսումնական պլան')
  const { user, isSuperAdmin } = useAuth()
  const toast = useToast()
  const confirm = useConfirm()
  const faculties = useFaculties()
  const [selectedFacultyId, setSelectedFacultyId] = useState(user?.facultyId ?? '')
  const [cohortId, setCohortId] = useState('')
  const [tab, setTab] = useState<PlanTab>('subjects')
  const [isSaving, setIsSaving] = useState(false)
  const [isImportOpen, setIsImportOpen] = useState(false)

  const facultyId = isSuperAdmin ? selectedFacultyId || faculties.data?.[0]?.id || '' : (user?.facultyId ?? '')
  const faculty = faculties.data?.find((item) => item.id === facultyId)
  const cohorts = useMemo(() => sortCohorts(faculty?.cohorts ?? []), [faculty])
  const cohort = cohorts.find((item) => item.id === cohortId) ?? cohorts[0]
  const plan = useCohortPlan(cohort?.id ?? '')
  const catalog = useAsyncData(
    () => (facultyId ? catalogRequests.getForFaculty(facultyId) : Promise.resolve(null)),
    [facultyId],
  )

  useEffect(() => {
    if (cohorts.length > 0 && !cohorts.some((item) => item.id === cohortId)) setCohortId(cohorts[0].id)
  }, [cohorts, cohortId])

  // Ֆայլի կուրսերը նախապես ստուգելու համար՝ բոլոր ֆակուլտետների անուններն ու կուրսերը
  const knownCohortKeys = useMemo(() => {
    const keys = new Map<string, string>()
    for (const item of faculties.data ?? []) {
      for (const cohortItem of item.cohorts ?? []) {
        keys.set(cohortKey(item.name, cohortItem.name), cohortItem.id)
        if (item.shortName) keys.set(cohortKey(item.shortName, cohortItem.name), cohortItem.id)
      }
    }
    return keys
  }, [faculties.data])

  const content: PlanContent | null = isSuperAdmin ? (plan.data?.draft ?? null) : (plan.data?.published ?? null)
  const hasPending = Boolean(plan.data?.hasPendingChanges)
  const canEdit = isSuperAdmin && Boolean(cohort)

  const run = async (action: () => Promise<unknown>, successMessage?: string) => {
    setIsSaving(true)
    try {
      await action()
      await plan.reload()
      if (successMessage) toast.success(successMessage)
    } catch (error) {
      toast.error(getErrorMessage(error))
    } finally {
      setIsSaving(false)
    }
  }

  const onAddSubject = async (subject: string, hours: number) => {
    if (!cohort) return
    await run(() => curriculumRequests.setSubject(cohort.id, { subject, hours }))
  }

  const onRemoveSubject = async (subject: string) => {
    if (!cohort) return
    const isConfirmed = await confirm({
      title: `Հեռացնե՞լ «${subject}»-ը պլանից`,
      message: 'Արդեն լրացված դասերը չեն ջնջվի, բայց առարկան այլևս ժամաքանակի սահմանափակում չի ունենա։',
      confirmText: 'Հեռացնել',
      isDanger: true,
    })
    if (!isConfirmed) return
    await run(() => curriculumRequests.removeSubject(cohort.id, subject))
  }

  const onChangeGrid = async (patch: Partial<PlanContent>) => {
    if (!cohort) return
    await run(() => curriculumRequests.updateDraft(cohort.id, patch))
  }

  const onPublish = async () => {
    if (!cohort) return
    const isConfirmed = await confirm({
      title: 'Հաստատե՞լ ուսումնական պլանը',
      message: `«${cohort.name}»-ի պլանը կդառնա տեսանելի ֆակուլտետի ադմինների և ուսանողների համար։ Աղյուսակից դուրս մնացած դասերը կջնջվեն։`,
      confirmText: 'Հաստատել',
    })
    if (!isConfirmed) return
    setIsSaving(true)
    try {
      const result = await curriculumRequests.publish(cohort.id)
      await plan.reload()
      await faculties.reload()
      // Այլ ձևաչափով գրված դասերը չեն ջնջվում — օգտատերը պետք է իմանա, որ դրանք տեղում են
      const kept = result.keptUnknownLessons > 0 ? ` ${result.keptUnknownLessons} այլ ձևաչափի դաս պահպանվեց։` : ''
      toast.success(
        result.removedLessons > 0
          ? `Պլանը հաստատվեց։ Աղյուսակից դուրս մնացած ${result.removedLessons} դաս ջնջվեց։${kept}`
          : `Պլանը հաստատվեց և այժմ տեսանելի է բոլորին։${kept}`,
      )
    } catch (error) {
      toast.error(getErrorMessage(error))
    } finally {
      setIsSaving(false)
    }
  }

  const onDiscard = async () => {
    if (!cohort) return
    const isConfirmed = await confirm({
      title: 'Չեղարկե՞լ չհաստատված փոփոխությունները',
      message: 'Սևագիրը կվերադառնա վերջին հաստատված տարբերակին։',
      confirmText: 'Չեղարկել փոփոխությունները',
      isDanger: true,
    })
    if (!isConfirmed) return
    await run(() => curriculumRequests.discard(cohort.id), 'Փոփոխությունները չեղարկվեցին')
  }

  return (
    <>
      <PageHeader
        title="Ուսումնական պլան"
        description="Կուրսի դասընթացները կիսամյակային ժամաքանակով, շաբաթվա օրերը և դասաժամերի ժամերը"
        actions={
          canEdit && (
            <>
              <Button
                variant="ghost"
                size="sm"
                icon={<FileSpreadsheet className="size-4" />}
                onClick={() => setIsImportOpen(true)}
                disabled={isSaving}
              >
                Ներմուծել Excel
              </Button>
              {hasPending && plan.data?.published && (
                <Button variant="ghost" size="sm" icon={<Undo2 className="size-4" />} onClick={onDiscard} disabled={isSaving}>
                  Չեղարկել
                </Button>
              )}
              <Button
                size="sm"
                variant={hasPending ? 'success' : 'secondary'}
                icon={<CheckCircle2 className="size-4" />}
                onClick={onPublish}
                disabled={isSaving || !hasPending}
              >
                {hasPending ? 'Հաստատել' : 'Հաստատված է'}
              </Button>
            </>
          )
        }
      />

      <Card className="mb-4 flex flex-col gap-3 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          {isSuperAdmin ? (
            <SelectInput
              value={facultyId}
              onChange={(event) => setSelectedFacultyId(event.target.value)}
              className="sm:w-72"
              aria-label="Ֆակուլտետ"
            >
              {faculties.data?.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </SelectInput>
          ) : (
            <p className="text-sm font-semibold">{faculty?.name}</p>
          )}
          <SelectInput
            value={cohort?.id ?? ''}
            onChange={(event) => setCohortId(event.target.value)}
            className="sm:w-64"
            aria-label="Կուրս"
          >
            {cohorts.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </SelectInput>
          {isSuperAdmin && (
            <SegmentedControl<PlanTab>
              value={tab}
              onChange={setTab}
              className="sm:ml-auto"
              options={[
                { value: 'subjects', label: 'Դասընթացներ' },
                { value: 'grid', label: 'Օրեր և ժամեր' },
              ]}
            />
          )}
        </div>

        {isSuperAdmin && hasPending && (
          <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
            Կան չհաստատված փոփոխություններ։ Մինչև «Հաստատել» սեղմելը դրանք չեն երևում ոչ ֆակուլտետի ադմինների, ոչ էլ ուսանողների
            մոտ։
          </p>
        )}
        {!isSuperAdmin && !plan.data?.published && !plan.isLoading && (
          <p className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            Այս կուրսի ուսումնական պլանը դեռ հաստատված չէ։
          </p>
        )}
      </Card>

      {plan.isLoading && !plan.data && <PageLoader />}
      {plan.error && <ErrorState message={plan.error} onRetry={plan.reload} />}

      {plan.data && cohort && (
        <Card className="p-4">
          {tab === 'subjects' || !isSuperAdmin ? (
            <PlanSubjectsEditor
              subjects={content?.subjects ?? []}
              usage={plan.data.usage}
              streams={cohort.settings.streams}
              canEdit={canEdit}
              suggestions={catalog.data?.subjects.map((item) => item.name) ?? []}
              onAdd={onAddSubject}
              onRemove={onRemoveSubject}
            />
          ) : (
            content && <PlanScheduleGrid content={content} canEdit={canEdit} onChange={onChangeGrid} />
          )}
        </Card>
      )}

      {plan.data && !cohort && (
        <Card className="flex items-center gap-3 p-5 text-sm text-slate-500 dark:text-slate-400">
          <ClipboardList className="size-5" />
          Այս ֆակուլտետում կուրսեր դեռ չկան։
        </Card>
      )}

      {canEdit && cohort && (
        <PlanImportModal
          isOpen={isImportOpen}
          onClose={() => setIsImportOpen(false)}
          fallback={{ cohortId: cohort.id, label: `${faculty?.name ?? ''} — ${cohort.name}`.trim() }}
          templateDefaults={{
            facultyName: faculty?.name ?? '',
            cohortNames: cohorts.map((item) => item.name),
            subjects: catalog.data?.subjects.map((item) => item.name) ?? [],
          }}
          knownCohortKeys={knownCohortKeys}
          onImported={async () => {
            await plan.reload()
          }}
        />
      )}

      {isSuperAdmin && plan.data?.publishedAt && (
        <p className="mt-3 flex items-center gap-1.5 text-xs text-slate-400">
          <CalendarClock className="size-3.5" />
          Վերջին հաստատումը՝ {new Date(plan.data.publishedAt).toLocaleString('hy-AM')}
        </p>
      )}
    </>
  )
}
