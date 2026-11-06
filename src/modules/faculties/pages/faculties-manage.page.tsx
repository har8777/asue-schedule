import { Eraser, Pencil, Plus, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Button } from '../../common/components/button.component'
import { useConfirm } from '../../common/components/confirm.context'
import { ErrorState, PageLoader } from '../../common/components/feedback.component'
import { FormField, TextInput } from '../../common/components/form-controls.component'
import { Modal } from '../../common/components/modal.component'
import { Badge, PageHeader } from '../../common/components/page-header.component'
import { useToast } from '../../common/components/toast.context'
import { useDocumentTitle } from '../../common/hooks/use-document-title'
import { getErrorMessage } from '../../common/http/http-error'
import { facultiesRequests } from '../faculties.requests'
import type { FacultyPayload, FacultyWithCohorts } from '../faculties.types'
import { useFaculties } from '../hooks/use-faculties'

interface FacultyFormModalProps {
  isOpen: boolean
  faculty: FacultyWithCohorts | null
  onClose: () => void
  onSaved: () => void
}

const FacultyFormModal = ({ isOpen, faculty, onClose, onSaved }: FacultyFormModalProps) => {
  const toast = useToast()
  const { register, handleSubmit, reset, formState } = useForm<FacultyPayload>()

  useEffect(() => {
    if (isOpen) reset({ name: faculty?.name ?? '', shortName: faculty?.shortName ?? '', building: faculty?.building ?? '' })
  }, [isOpen, faculty, reset])

  const onSubmit = async (values: FacultyPayload) => {
    const payload = { name: values.name.trim(), shortName: values.shortName.trim(), building: values.building.trim() }
    try {
      if (faculty) await facultiesRequests.update(faculty.id, payload)
      else await facultiesRequests.create(payload)
      toast.success(faculty ? 'Ֆակուլտետը թարմացվեց' : 'Ֆակուլտետը ստեղծվեց՝ 5 կուրսերով')
      onSaved()
      onClose()
    } catch (error) {
      toast.error(getErrorMessage(error))
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={faculty ? 'Խմբագրել ֆակուլտետը' : 'Նոր ֆակուլտետ'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Չեղարկել
          </Button>
          <Button type="submit" form="faculty-form" isLoading={formState.isSubmitting}>
            Պահպանել
          </Button>
        </>
      }
    >
      <form id="faculty-form" onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
        <FormField label="Անվանում" error={formState.errors.name?.message}>
          <TextInput {...register('name', { required: 'Մուտքագրեք անվանումը', maxLength: { value: 150, message: 'Առավելագույնը 150 նիշ' } })} />
        </FormField>
        <FormField label="Կարճ անվանում" hint="Ցուցադրվում է ցուցակներում, օր.՝ «Ֆինանսներ»">
          <TextInput {...register('shortName', { maxLength: 60 })} />
        </FormField>
        <FormField
          label="Մասնաշենք"
          hint="Լսարանների զբաղվածությունը ստուգվում է նույն մասնաշենքի ներսում։ Դատարկ թողնելու դեպքում ֆակուլտետը կունենա իր առանձին մասնաշենքը։"
        >
          <TextInput {...register('building', { maxLength: 100 })} />
        </FormField>
      </form>
    </Modal>
  )
}

/** Ֆակուլտետների կառավարում (միայն գլխավոր ադմինիստրատոր)։ */
export const FacultiesManagePage = () => {
  useDocumentTitle('Ֆակուլտետներ')
  const toast = useToast()
  const confirm = useConfirm()
  const { data, error, isLoading, reload } = useFaculties()
  const [editing, setEditing] = useState<FacultyWithCohorts | null>(null)
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
              </div>
            </div>
            <div className="flex gap-1">
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

      <FacultyFormModal isOpen={isFormOpen} faculty={editing} onClose={() => setIsFormOpen(false)} onSaved={reload} />
    </>
  )
}
