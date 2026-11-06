import { BookOpen, DoorOpen, Download, FileSpreadsheet, Plus, Trash2, UserRound } from 'lucide-react'
import { useMemo, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useAuth } from '../../auth/auth.context'
import { Button } from '../../common/components/button.component'
import { useConfirm } from '../../common/components/confirm.context'
import { EmptyState, ErrorState, PageLoader } from '../../common/components/feedback.component'
import { SegmentedControl, SelectInput, TextInput } from '../../common/components/form-controls.component'
import { Card, PageHeader } from '../../common/components/page-header.component'
import { useToast } from '../../common/components/toast.context'
import { useAsyncData } from '../../common/hooks/use-async-data'
import { useDocumentTitle } from '../../common/hooks/use-document-title'
import { getErrorMessage } from '../../common/http/http-error'
import { compareArmenian } from '../../common/utils/format'
import { useFaculties } from '../../faculties/hooks/use-faculties'
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
  const [type, setType] = useState<CatalogType>('subject')
  const [filter, setFilter] = useState('')
  const [isImporting, setIsImporting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const catalog = useAsyncData(() => (facultyId ? catalogRequests.getForFaculty(facultyId) : Promise.resolve(EMPTY_CATALOG)), [facultyId])
  const { register, handleSubmit, reset, formState } = useForm<AddItemForm>({ defaultValues: { name: '', floor: '' } })

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

        {canEditFaculty(facultyId) && (
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

      <TextInput value={filter} onChange={(event) => setFilter(event.target.value)} placeholder="Զտել ցուցակը..." className="mb-3" aria-label="Զտել" />

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
  )
}
