import { Eraser, Eye, EyeOff, Pencil, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Button } from '../../common/components/button.component'
import { useConfirm } from '../../common/components/confirm.context'
import { ErrorState, PageLoader } from '../../common/components/feedback.component'
import { Badge, PageHeader } from '../../common/components/page-header.component'
import { useToast } from '../../common/components/toast.context'
import { useDocumentTitle } from '../../common/hooks/use-document-title'
import { getErrorMessage } from '../../common/http/http-error'
import { facultiesRequests } from '../faculties.requests'
import type { FacultyWithCohorts } from '../faculties.types'
import { useFaculties } from '../hooks/use-faculties'
import { FacultyFormModal } from '../components/faculty-form-modal.component'
import { PublishBanner } from '../components/publish-banner.component'

/** Ֆակուլտետների կառավարում (միայն գլխավոր ադմինիստրատոր)։ */
export const FacultiesManagePage = () => {
  useDocumentTitle('Ֆակուլտետներ')
  const toast = useToast()
  const confirm = useConfirm()
  const { data, error, isLoading, reload } = useFaculties()
  const [editing, setEditing] = useState<FacultyWithCohorts | null>(null)
  const [publishingId, setPublishingId] = useState('')
  const [isFormOpen, setIsFormOpen] = useState(false)

  const openForm = (faculty: FacultyWithCohorts | null) => {
    setEditing(faculty)
    setIsFormOpen(true)
  }

  const clearLessons = async (faculty: FacultyWithCohorts) => {
    const isConfirmed = await confirm({
      title: 'Մաքրե՞լ դասացուցակը',
      message: `«${faculty.name}»-ի ԲՈԼՈՐ կուրսերի դասերը կջնջվեն։ Կառուցվածքը (կուրսեր, հոսքեր) կմնա։`,
      confirmText: 'Մաքրել',
      isDanger: true,
    })
    if (!isConfirmed) return
    try {
      const result = await facultiesRequests.clearLessons(faculty.id)
      toast.success(`Ջնջվեց ${result.deleted} դաս`)
    } catch (clearError) {
      toast.error(getErrorMessage(clearError))
    }
  }

  const remove = async (faculty: FacultyWithCohorts) => {
    const isConfirmed = await confirm({
      title: 'Ջնջե՞լ ֆակուլտետը',
      message: `«${faculty.name}»-ը, նրա կուրսերը, դասացուցակը և տեղեկատուն ամբողջությամբ կջնջվեն։ Խորհուրդ է տրվում նախապես պահուստային պատճեն ստեղծել։`,
      confirmText: 'Ջնջել ամբողջությամբ',
      isDanger: true,
    })
    if (!isConfirmed) return
    try {
      await facultiesRequests.remove(faculty.id)
      toast.success('Ֆակուլտետը ջնջվեց')
      void reload()
    } catch (removeError) {
      toast.error(getErrorMessage(removeError))
    }
  }

  /** Հրապարակում է ֆակուլտետը իր կուրսերով կամ հետ բերում սևագրի։ */
  const togglePublished = async (faculty: FacultyWithCohorts) => {
    if (faculty.isPublished) {
      const isConfirmed = await confirm({
        title: `Հանե՞լ «${faculty.name}»-ը հրապարակումից`,
        message: 'Ֆակուլտետը և նրա կուրսերը կդադարեն երևալ ուսանողների և ֆակուլտետի ադմինների մոտ։ Տվյալները չեն ջնջվի։',
        confirmText: 'Հանել հրապարակումից',
        isDanger: true,
      })
      if (!isConfirmed) return
    }
    setPublishingId(faculty.id)
    try {
      await facultiesRequests.setPublished(faculty.id, !faculty.isPublished)
      void reload()
      toast.success(faculty.isPublished ? 'Ֆակուլտետը հանվեց հրապարակումից' : 'Ֆակուլտետը հրապարակվեց իր կուրսերով')
    } catch (publishError) {
      toast.error(getErrorMessage(publishError))
    } finally {
      setPublishingId('')
    }
  }

  const draftFaculties = data?.filter((faculty) => !faculty.isPublished) ?? []
  const draftCohorts = (data ?? []).flatMap((faculty) =>
    faculty.isPublished ? faculty.cohorts.filter((cohort) => !cohort.isPublished) : [],
  )

  return (
    <>
      <PageHeader
        title="Ֆակուլտետներ"
        actions={
          <Button icon={<Plus className="size-4" />} onClick={() => openForm(null)}>
            Նոր ֆակուլտետ
          </Button>
        }
      />
      <PublishBanner faculties={draftFaculties.length} cohorts={draftCohorts.length} />

      {isLoading && !data && <PageLoader />}
      {error && <ErrorState message={error} onRetry={reload} />}

      <ul className="flex flex-col gap-3">
        {data?.map((faculty) => (
          <li
            key={faculty.id}
            className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center dark:border-slate-800 dark:bg-slate-900"
          >
            <div className="min-w-0 flex-1">
              <p className="font-semibold">{faculty.name}</p>
              <div className="mt-1 flex flex-wrap gap-1.5">
                <Badge>{faculty.shortName}</Badge>
                <Badge>{faculty.cohorts.length} կուրս/ծրագիր</Badge>
                {faculty.building && <Badge>{faculty.building}</Badge>}
                {faculty.dean && <Badge>Դեկան՝ {faculty.dean}</Badge>}
                {faculty.divisions.map((division) => (
                  <Badge key={division.id}>{division.name}</Badge>
                ))}
                {!faculty.isPublished && (
                  <span className="inline-flex items-center gap-1 rounded-md bg-amber-100 px-1.5 py-0.5 text-[11px] font-bold text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                    <EyeOff className="size-3" />
                    Սևագիր
                  </span>
                )}
              </div>
            </div>
            <div className="flex gap-1">
              <Button
                variant={faculty.isPublished ? 'ghost' : 'success'}
                size="sm"
                icon={faculty.isPublished ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                isLoading={publishingId === faculty.id}
                onClick={() => togglePublished(faculty)}
              >
                {faculty.isPublished ? 'Թաքցնել' : 'Հրապարակել'}
              </Button>
              <Button variant="ghost" size="sm" icon={<Pencil className="size-4" />} onClick={() => openForm(faculty)}>
                Խմբագրել
              </Button>
              <Button variant="ghost" size="icon" onClick={() => clearLessons(faculty)} title="Մաքրել դասացուցակը" aria-label="Մաքրել դասացուցակը">
                <Eraser className="size-4" />
              </Button>
              <Button variant="ghost" size="icon" className="text-red-500" onClick={() => remove(faculty)} title="Ջնջել" aria-label="Ջնջել">
                <Trash2 className="size-4" />
              </Button>
            </div>
          </li>
        ))}
      </ul>

      <FacultyFormModal
        isOpen={isFormOpen}
        faculty={editing}
        faculties={data ?? []}
        onClose={() => setIsFormOpen(false)}
        onSaved={reload}
      />
    </>
  )
}
