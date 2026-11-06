import { Building2, DoorOpen, Pencil, Plus, TriangleAlert } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router-dom'
import { APP_ROUTES } from '../../../app/app.routes'
import { ROLE_LABELS } from '../../auth/auth.constants'
import { useAuth } from '../../auth/auth.context'
import { Button } from '../../common/components/button.component'
import { ErrorState, PageLoader } from '../../common/components/feedback.component'
import { FormField, TextInput } from '../../common/components/form-controls.component'
import { Modal } from '../../common/components/modal.component'
import { Badge, Card, PageHeader } from '../../common/components/page-header.component'
import { useToast } from '../../common/components/toast.context'
import { useDocumentTitle } from '../../common/hooks/use-document-title'
import { getErrorMessage } from '../../common/http/http-error'
import { cn } from '../../common/utils/classnames'
import type { FacultyWithCohorts } from '../../faculties/faculties.types'
import { useFaculties } from '../../faculties/hooks/use-faculties'
import { scheduleRequests } from '../../schedule/schedule.requests'
import { sortCohorts } from '../../schedule/schedule.utils'

const quickLinkClass =
  'flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-sm font-semibold shadow-sm transition-colors hover:border-brand-300 dark:border-slate-800 dark:bg-slate-900'

const NewCohortModal = ({ faculty, onClose, onCreated }: { faculty: FacultyWithCohorts | null; onClose: () => void; onCreated: () => void }) => {
  const toast = useToast()
  const { register, handleSubmit, reset, formState } = useForm<{ name: string }>({ defaultValues: { name: '' } })

  const onSubmit = async ({ name }: { name: string }) => {
    if (!faculty) return
    try {
      await scheduleRequests.createCohort(faculty.id, { name: name.trim(), kind: 'program' })
      toast.success('Ավելացվեց')
      reset()
      onCreated()
      onClose()
    } catch (error) {
      toast.error(getErrorMessage(error))
    }
  }

  return (
    <Modal
      isOpen={faculty !== null}
      onClose={onClose}
      size="sm"
      title="Նոր կուրս կամ ծրագիր"
      description={faculty?.name}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Չեղարկել
          </Button>
          <Button type="submit" form="new-cohort-form" isLoading={formState.isSubmitting}>
            Ավելացնել
          </Button>
        </>
      }
    >
      <form id="new-cohort-form" onSubmit={handleSubmit(onSubmit)} noValidate>
        <FormField label="Անվանում" error={formState.errors.name?.message} hint="Օր.՝ «Զբոսաշրջություն» կամ «6-րդ կուրս»">
          <TextInput {...register('name', { required: 'Մուտքագրեք անվանումը', maxLength: { value: 80, message: 'Առավելագույնը 80 նիշ' } })} />
        </FormField>
      </form>
    </Modal>
  )
}

/** Ադմինի մեկնարկային էջը. իր ֆակուլտետի (կամ բոլոր ֆակուլտետների) կուրսերը՝ խմբագրման համար։ */
export const DashboardPage = () => {
  useDocumentTitle('Վահանակ')
  const { user, isSuperAdmin, canEditFaculty } = useAuth()
  const { data, error, isLoading, reload } = useFaculties()
  const [newCohortFaculty, setNewCohortFaculty] = useState<FacultyWithCohorts | null>(null)
  const editable = data?.filter((faculty) => canEditFaculty(faculty.id)) ?? []

  return (
    <>
      <PageHeader
        title={`Բարի գալուստ, ${user?.displayName ?? ''}`}
        description={user ? <Badge className="mt-1">{ROLE_LABELS[user.role]}</Badge> : null}
      />

      <div className="mb-6 grid gap-3 sm:grid-cols-2">
        <Link to={APP_ROUTES.admin.conflicts} className={quickLinkClass}>
          <span className="flex size-10 items-center justify-center rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
            <TriangleAlert className="size-5" />
          </span>
          Ստուգել խաչվող դասերը
        </Link>
        <Link to={APP_ROUTES.admin.freeRooms} className={quickLinkClass}>
          <span className="flex size-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
            <DoorOpen className="size-5" />
          </span>
          Գտնել ազատ լսարան
        </Link>
      </div>

      <h2 className="mb-3 text-lg font-bold">{isSuperAdmin ? 'Բոլոր ֆակուլտետները' : 'Իմ ֆակուլտետը'}</h2>
      {isLoading && !data && <PageLoader />}
      {error && <ErrorState message={error} onRetry={reload} />}

      <div className="grid gap-4 xl:grid-cols-2">
        {editable.map((faculty) => (
          <Card key={faculty.id} className="p-4">
            <div className="mb-3 flex items-start gap-3">
              <Building2 className="mt-0.5 size-5 shrink-0 text-brand-600" />
              <h3 className="flex-1 leading-snug font-bold">{faculty.name}</h3>
              <Button variant="ghost" size="sm" icon={<Plus className="size-4" />} onClick={() => setNewCohortFaculty(faculty)}>
                Կուրս
              </Button>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {sortCohorts(faculty.cohorts).map((cohort) => (
                <Link
                  key={cohort.id}
                  to={APP_ROUTES.admin.editor(cohort.id)}
                  className={cn(
                    'flex items-center justify-between gap-2 rounded-xl border px-3 py-2.5 text-sm font-semibold transition-colors hover:border-brand-400 hover:bg-brand-50 dark:hover:bg-slate-800',
                    cohort.kind === 'program' ? 'border-emerald-200 dark:border-emerald-900' : 'border-slate-200 dark:border-slate-700',
                  )}
                >
                  <span className="truncate">{cohort.name}</span>
                  <Pencil className="size-4 shrink-0 text-slate-400" />
                </Link>
              ))}
            </div>
          </Card>
        ))}
      </div>

      <NewCohortModal faculty={newCohortFaculty} onClose={() => setNewCohortFaculty(null)} onCreated={reload} />
    </>
  )
}
