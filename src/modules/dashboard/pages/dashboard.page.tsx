import { Building2, DoorOpen, Eye, EyeOff, Pencil, Plus, TriangleAlert } from 'lucide-react'
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
import { facultiesRequests } from '../../faculties/faculties.requests'
import { useFaculties } from '../../faculties/hooks/use-faculties'
import { PublishBanner } from '../../faculties/components/publish-banner.component'
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
  const toast = useToast()
  const [newCohortFaculty, setNewCohortFaculty] = useState<FacultyWithCohorts | null>(null)
  const [publishingId, setPublishingId] = useState('')
  const editable = data?.filter((faculty) => canEditFaculty(faculty.id)) ?? []
  const draftCohorts = editable.flatMap((faculty) =>
    faculty.isPublished ? faculty.cohorts.filter((cohort) => !cohort.isPublished) : [],
  )
  const draftFaculties = editable.filter((faculty) => !faculty.isPublished)

  /** Հրապարակում է կուրսը. դրանից հետո այն երևում է ուսանողներին։ */
  const publishCohort = async (cohortId: string) => {
    setPublishingId(cohortId)
    try {
      await scheduleRequests.setCohortPublished(cohortId, true)
      await reload()
      toast.success('Կուրսը հրապարակվեց և այժմ տեսանելի է բոլորին')
    } catch (publishError) {
      toast.error(getErrorMessage(publishError))
    } finally {
      setPublishingId('')
    }
  }

  const publishFaculty = async (facultyId: string) => {
    setPublishingId(facultyId)
    try {
      await facultiesRequests.setPublished(facultyId, true)
      await reload()
      toast.success('Ֆակուլտետը հրապարակվեց իր կուրսերով')
    } catch (publishError) {
      toast.error(getErrorMessage(publishError))
    } finally {
      setPublishingId('')
    }
  }

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

      {isSuperAdmin && <PublishBanner faculties={draftFaculties.length} cohorts={draftCohorts.length} />}

      <h2 className="mb-3 text-lg font-bold">{isSuperAdmin ? 'Բոլոր ֆակուլտետները' : 'Իմ ֆակուլտետը'}</h2>
      {isLoading && !data && <PageLoader />}
      {error && <ErrorState message={error} onRetry={reload} />}

      <div className="grid gap-4 xl:grid-cols-2">
        {editable.map((faculty) => (
          <Card key={faculty.id} className="p-4">
            <div className="mb-3 flex items-start gap-3">
              <Building2 className="mt-0.5 size-5 shrink-0 text-brand-600" />
              <div className="flex-1">
                <h3 className="leading-snug font-bold">{faculty.name}</h3>
                {!faculty.isPublished && (
                  <span className="mt-1 inline-flex items-center gap-1 rounded-md bg-amber-100 px-1.5 py-0.5 text-[11px] font-bold text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                    <EyeOff className="size-3" />
                    Սևագիր՝ տեսնում եք միայն Դուք
                  </span>
                )}
              </div>
              {isSuperAdmin && !faculty.isPublished && (
                <Button
                  variant="success"
                  size="sm"
                  icon={<Eye className="size-4" />}
                  isLoading={publishingId === faculty.id}
                  onClick={() => publishFaculty(faculty.id)}
                >
                  Հրապարակել
                </Button>
              )}
              <Button variant="ghost" size="sm" icon={<Plus className="size-4" />} onClick={() => setNewCohortFaculty(faculty)}>
                Կուրս
              </Button>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {sortCohorts(faculty.cohorts).map((cohort) => (
                <div key={cohort.id} className="flex flex-col gap-1">
                  <Link
                    to={APP_ROUTES.admin.editor(cohort.id)}
                    className={cn(
                      'flex items-center justify-between gap-2 rounded-xl border px-3 py-2.5 text-sm font-semibold transition-colors hover:border-brand-400 hover:bg-brand-50 dark:hover:bg-slate-800',
                      !cohort.isPublished
                        ? 'border-amber-300 bg-amber-50/60 dark:border-amber-800 dark:bg-amber-950/20'
                        : cohort.kind === 'program'
                          ? 'border-emerald-200 dark:border-emerald-900'
                          : 'border-slate-200 dark:border-slate-700',
                    )}
                  >
                    <span className="truncate">{cohort.name}</span>
                    {!cohort.isPublished && <EyeOff className="size-4 shrink-0 text-amber-600" />}
                    <Pencil className="size-4 shrink-0 text-slate-400" />
                  </Link>
                  {isSuperAdmin && faculty.isPublished && !cohort.isPublished && (
                    <Button
                      variant="success"
                      size="sm"
                      className="self-start"
                      icon={<Eye className="size-4" />}
                      isLoading={publishingId === cohort.id}
                      onClick={() => publishCohort(cohort.id)}
                    >
                      Հրապարակել
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>

      <NewCohortModal faculty={newCohortFaculty} onClose={() => setNewCohortFaculty(null)} onCreated={reload} />
    </>
  )
}
