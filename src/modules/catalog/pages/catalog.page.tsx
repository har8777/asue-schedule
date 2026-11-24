import { BookOpen, DoorOpen, Download, FileSpreadsheet, Plus, Trash2, UserRound } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { APP_ROUTES } from '../../../app/app.routes'
import { useForm } from 'react-hook-form'
import { useAuth } from '../../auth/auth.context'
import { Button } from '../../common/components/button.component'
import { useConfirm } from '../../common/components/confirm.context'
import { DangerConfirmModal } from '../../common/components/danger-confirm-modal.component'
import { EmptyState, ErrorState, PageLoader } from '../../common/components/feedback.component'
import { SegmentedControl, SelectInput, TextInput } from '../../common/components/form-controls.component'
import { Card, PageHeader } from '../../common/components/page-header.component'
import { useToast } from '../../common/components/toast.context'
import { useAsyncData } from '../../common/hooks/use-async-data'
import { useDocumentTitle } from '../../common/hooks/use-document-title'
import { getErrorMessage } from '../../common/http/http-error'
import { compareArmenian } from '../../common/utils/format'
import { useFaculties } from '../../faculties/hooks/use-faculties'
import { PlanSubjectsEditor } from '../../curriculum/components/plan-subjects-editor.component'
import { curriculumRequests } from '../../curriculum/curriculum.requests'
import { useCohortPlan } from '../../curriculum/hooks/use-cohort-plan'
import { sortCohorts } from '../../schedule/schedule.utils'
import { catalogRequests } from '../catalog.requests'
import { CATALOG_TYPE_LABELS, CATALOG_TYPE_SINGULAR, EMPTY_CATALOG, type CatalogItem, type CatalogType } from '../catalog.types'
import { downloadCatalogTemplate, parseCatalogWorkbook } from '../services/catalog-excel.service'

interface AddItemForm {
  name: string
  floor: string
}

const TYPE_ICONS = { subject: BookOpen, lecturer: UserRound, room: DoorOpen }
const LIST_KEY: Record<CatalogType, 'subjects' | 'lecturers' | 'rooms'> = { subject: 'subjects', lecturer: 'lecturers', room: 'rooms' }

/** Ֆակուլտետի տեղեկատու՝ առաջարկների համար դաս լրացնելիս։ Նոր անունները ավելանում են նաև ավտոմատ։ */
export const CatalogPage = () => {
  useDocumentTitle('Տեղեկատու')
  const { user, isSuperAdmin, canEditFaculty } = useAuth()
  const toast = useToast()
  const confirm = useConfirm()
  const faculties = useFaculties()
  const [selectedFacultyId, setSelectedFacultyId] = useState(user?.facultyId ?? '')
  const facultyId = isSuperAdmin ? selectedFacultyId || faculties.data?.[0]?.id || '' : (user?.facultyId ?? '')
  const [cohortId, setCohortId] = useState('')
  const [type, setType] = useState<CatalogType>('subject')
  const [filter, setFilter] = useState('')
  const [isImporting, setIsImporting] = useState(false)
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const catalog = useAsyncData(() => (facultyId ? catalogRequests.getForFaculty(facultyId) : Promise.resolve(EMPTY_CATALOG)), [facultyId])
  const { register, handleSubmit, reset, formState } = useForm<AddItemForm>({ defaultValues: { name: '', floor: '' } })

  // Ֆակուլտետ + կուրս. կուրս ընտրելիս ցուցադրվում են տվյալ կուրսի դասընթացները ժամաքանակով
  const cohorts = useMemo(() => sortCohorts(faculties.data?.find((item) => item.id === facultyId)?.cohorts ?? []), [faculties.data, facultyId])
  const cohort = cohorts.find((item) => item.id === cohortId) ?? null
  const plan = useCohortPlan(cohort?.id ?? '')
  const planContent = isSuperAdmin ? (plan.data?.draft ?? null) : (plan.data?.published ?? null)
  const isPlanView = Boolean(cohort) && type === 'subject'

  useEffect(() => {
    if (cohortId && !cohorts.some((item) => item.id === cohortId)) setCohortId('')
  }, [cohorts, cohortId])

  const onAddPlanSubject = async (subject: string, hours: number) => {
    if (!cohort) return
    try {
      plan.setData(await curriculumRequests.setSubject(cohort.id, { subject, hours }))
    } catch (error) {
      toast.error(getErrorMessage(error))
    }
  }

  const onRemovePlanSubject = async (subject: string) => {
    if (!cohort) return
    const isConfirmed = await confirm({
      title: `Հեռացնե՞լ «${subject}»-ը պլանից`,
      message: 'Արդեն լրացված դասերը չեն ջնջվի, բայց առարկան այլևս ժամաքանակի սահմանափակում չի ունենա։',
      confirmText: 'Հեռացնել',
      isDanger: true,
    })
    if (!isConfirmed) return
    try {
      plan.setData(await curriculumRequests.removeSubject(cohort.id, subject))
    } catch (error) {
      toast.error(getErrorMessage(error))
    }
  }

  const items = useMemo(() => {
    const list: CatalogItem[] = catalog.data?.[LIST_KEY[type]] ?? []
    const needle = filter.trim().toLowerCase()
    return list.filter((item) => !needle || item.name.toLowerCase().includes(needle)).sort((a, b) => compareArmenian(a.floor + a.name, b.floor + b.name))
  }, [catalog.data, type, filter])

  const onAdd = async ({ name, floor }: AddItemForm) => {
    try {
      const updated = await catalogRequests.add(facultyId, { type, name: name.trim(), floor: floor.trim() || undefined })
      catalog.setData(updated)
      reset({ name: '', floor })
    } catch (error) {
      toast.error(getErrorMessage(error))
    }
  }

  const onRemove = async (item: CatalogItem) => {
    const isConfirmed = await confirm({
      title: `Հեռացնե՞լ «${item.name}»-ը`,
      message: 'Տարրը կհեռացվի միայն առաջարկների ցուցակից։ Արդեն լրացված դասերը չեն փոխվի։',
      confirmText: 'Հեռացնել',
      isDanger: true,
    })
    if (!isConfirmed) return
    try {
      await catalogRequests.remove(item.id)
      void catalog.reload()
    } catch (error) {
      toast.error(getErrorMessage(error))
    }
  }

  /**
   * Ջնջում է ճիշտ այն, ինչ ցուցակում երևում է — զտիչի հետ միասին։ Պլանի տեսքում
   * ջնջվում են կուրսի դասընթացները (սևագրում), այլապես՝ ֆակուլտետի տեղեկատուի տարրերը։
   */
  const onBulkDelete = async () => {
    try {
      if (isPlanView && cohort) {
        plan.setData(await curriculumRequests.updateDraft(cohort.id, { subjects: [] }))
        toast.success(`Ջնջվեց ${planContent?.subjects.length ?? 0} դասընթաց։ Փոփոխությունը սևագրում է՝ սեղմեք «Հաստատել»։`)
      } else {
        const result = await catalogRequests.removeMany(items.map((item) => item.id))
        catalog.setData(result.catalog)
        toast.success(`Ջնջվեց ${result.removed} տարր`)
      }
      setIsBulkDeleteOpen(false)
    } catch (error) {
      toast.error(getErrorMessage(error))
    }
  }

  const onImport = async (file: File) => {
    setIsImporting(true)
    try {
      const rows = await parseCatalogWorkbook(file)
      if (rows.length === 0) {
        toast.error('Ֆայլում համապատասխան տողեր չգտնվեցին (սյունակներ՝ Ֆակուլտետ, Տեսակ, Անվանում)')
        return
      }
      const result = await catalogRequests.import(rows)
      toast.success(`Ավելացվեց ${result.added} տարր, բաց թողնվեց ${result.skipped} (արդեն կա կամ ֆակուլտետը չի գտնվել)`)
      void catalog.reload()
    } catch (error) {
      toast.error(getErrorMessage(error, 'Excel ֆայլը կարդալ չհաջողվեց'))
    } finally {
      setIsImporting(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const facultyName = faculties.data?.find((item) => item.id === facultyId)?.name ?? ''
  const planSubjectCount = planContent?.subjects.length ?? 0
  const bulkCount = isPlanView ? planSubjectCount : items.length
  const isFiltered = !isPlanView && filter.trim().length > 0
  const canBulkDelete = (isPlanView ? isSuperAdmin : canEditFaculty(facultyId)) && bulkCount > 0

  const Icon = TYPE_ICONS[type]

  return (
    <>
      <PageHeader
        title="Տեղեկատու"
        description="Առարկաներ, դասախոսներ և լսարաններ, որոնք առաջարկվում են դաս լրացնելիս"
        actions={
          isSuperAdmin && (
            <>
              <Button variant="ghost" size="sm" icon={<Download className="size-4" />} onClick={() => downloadCatalogTemplate(faculties.data?.map((f) => f.name) ?? [])}>
                Excel ձևանմուշ
              </Button>
              <Button variant="secondary" size="sm" isLoading={isImporting} icon={<FileSpreadsheet className="size-4" />} onClick={() => fileInputRef.current?.click()}>
                Ներմուծել Excel
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={(event) => event.target.files?.[0] && onImport(event.target.files[0])}
              />
            </>
          )
        }
      />

      <Card className="mb-4 flex flex-col gap-3 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          {isSuperAdmin ? (
            <SelectInput value={facultyId} onChange={(event) => setSelectedFacultyId(event.target.value)} className="sm:w-72" aria-label="Ֆակուլտետ">
              {faculties.data?.map((faculty) => (
                <option key={faculty.id} value={faculty.id}>
                  {faculty.name}
                </option>
              ))}
            </SelectInput>
          ) : (
            <p className="text-sm font-semibold">{faculties.data?.find((faculty) => faculty.id === facultyId)?.name}</p>
          )}
          <SelectInput value={cohortId} onChange={(event) => setCohortId(event.target.value)} className="sm:w-60" aria-label="Կուրս">
            <option value="">Բոլոր կուրսերը</option>
            {cohorts.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </SelectInput>
          <SegmentedControl<CatalogType>
            value={type}
            onChange={setType}
            className="sm:ml-auto"
            options={(Object.keys(CATALOG_TYPE_LABELS) as CatalogType[]).map((key) => ({
              value: key,
              label: `${CATALOG_TYPE_LABELS[key]} (${catalog.data?.[LIST_KEY[key]].length ?? 0})`,
            }))}
          />
        </div>

        {isPlanView && (
          <p className="rounded-lg bg-brand-50 px-3 py-2 text-xs font-semibold text-brand-800 dark:bg-brand-900/40 dark:text-brand-100">
            {cohort?.name}՝ ուսումնական պլանի դասընթացները ժամաքանակով։{' '}
            <Link to={APP_ROUTES.admin.curriculum} className="underline">
              Օրեր և ժամեր
            </Link>
          </p>
        )}

        {!isPlanView && canEditFaculty(facultyId) && (
          <form onSubmit={handleSubmit(onAdd)} className="flex flex-col gap-2 sm:flex-row" noValidate>
            <TextInput
              placeholder={`Նոր ${CATALOG_TYPE_SINGULAR[type].toLowerCase()}`}
              hasError={Boolean(formState.errors.name)}
              {...register('name', { required: true, maxLength: 200 })}
            />
            {type === 'room' && <TextInput placeholder="Հարկ (օր.՝ 3-րդ հարկ)" className="sm:w-48" {...register('floor')} />}
            <Button type="submit" icon={<Plus className="size-4" />} isLoading={formState.isSubmitting}>
              Ավելացնել
            </Button>
          </form>
        )}
      </Card>

      {isPlanView ? (
        <>
          {plan.isLoading && !plan.data && <PageLoader />}
          {plan.error && <ErrorState message={plan.error} onRetry={plan.reload} />}
          {plan.data && cohort && (
            <>
              {isSuperAdmin && plan.data.hasPendingChanges && (
                <p className="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
                  Կան չհաստատված փոփոխություններ։ Դրանք կերևան մյուսների մոտ միայն «Ուսումնական պլան» էջից հաստատելուց հետո։
                </p>
              )}
              {!isSuperAdmin && !plan.data.published && (
                <p className="mb-3 rounded-lg bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                  Այս կուրսի ուսումնական պլանը դեռ հաստատված չէ։
                </p>
              )}
              {canBulkDelete && (
                <div className="mb-3 flex justify-end">
                  <Button
                    variant="danger"
                    size="sm"
                    icon={<Trash2 className="size-4" />}
                    onClick={() => setIsBulkDeleteOpen(true)}
                  >
                    Ջնջել բոլոր դասընթացները ({bulkCount})
                  </Button>
                </div>
              )}
              <PlanSubjectsEditor
                subjects={planContent?.subjects ?? []}
                usage={plan.data.usage}
                streams={cohort.settings.streams}
                canEdit={isSuperAdmin}
                suggestions={catalog.data?.subjects.map((item) => item.name) ?? []}
                onAdd={onAddPlanSubject}
                onRemove={onRemovePlanSubject}
              />
            </>
          )}
        </>
      ) : (
        <>
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center">
        <TextInput value={filter} onChange={(event) => setFilter(event.target.value)} placeholder="Զտել ցուցակը..." aria-label="Զտել" />
        {canBulkDelete && (
          <Button
            variant="danger"
            size="sm"
            className="shrink-0"
            icon={<Trash2 className="size-4" />}
            onClick={() => setIsBulkDeleteOpen(true)}
          >
            {isFiltered ? `Ջնջել ցուցակը (${bulkCount})` : `Ջնջել բոլորը (${bulkCount})`}
          </Button>
        )}
      </div>

      {catalog.isLoading && !catalog.data && <PageLoader />}
      {catalog.error && <ErrorState message={catalog.error} onRetry={catalog.reload} />}
      {catalog.data && items.length === 0 && <EmptyState icon={<Icon className="size-10" />} title="Ցուցակը դատարկ է" />}

      <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {items.map((item) => (
          <li key={item.id} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-900">
            <Icon className="size-4 shrink-0 text-slate-400" />
            <span className="min-w-0 flex-1 truncate font-medium">{item.name}</span>
            {item.floor && <span className="text-xs text-slate-400">{item.floor}</span>}
            {canEditFaculty(facultyId) && (
              <button type="button" onClick={() => onRemove(item)} className="cursor-pointer rounded p-1 text-slate-300 hover:text-red-600" aria-label={`Հեռացնել ${item.name}`}>
                <Trash2 className="size-4" />
              </button>
            )}
          </li>
        ))}
      </ul>
        </>
      )}

      <DangerConfirmModal
        isOpen={isBulkDeleteOpen}
        onClose={() => setIsBulkDeleteOpen(false)}
        onConfirm={onBulkDelete}
        title={isPlanView ? 'Ջնջե՞լ բոլոր դասընթացները' : 'Ջնջե՞լ ցուցակը'}
        confirmText={`Ջնջել ${bulkCount}-ը`}
        message={
          isPlanView ? (
            <>
              Կջնջվի <b>{bulkCount} դասընթաց</b> «{cohort?.name}» կուրսի ուսումնական պլանից ({facultyName})։ Արդեն լրացված
              դասերը չեն ջնջվի, բայց առարկաները այլևս ժամաքանակի սահմանափակում չեն ունենա։ Փոփոխությունը մնում է
              սևագրում՝ մինչև «Հաստատել» սեղմելը։
            </>
          ) : (
            <>
              Կջնջվի <b>{bulkCount} {CATALOG_TYPE_SINGULAR[type].toLowerCase()}</b> «{facultyName}»-ի տեղեկատուից
              {isFiltered ? <> (միայն «{filter.trim()}» զտիչին համապատասխանողները)</> : null}։ Արդեն լրացված դասերը չեն
              փոխվի — ջնջվում է միայն առաջարկների ցուցակը։ Գործողությունը անվերադարձ է։
            </>
          )
        }
      />
    </>
  )
}
