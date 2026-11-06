import { History, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { APP_ROUTES } from '../../../app/app.routes'
import { useAuth } from '../../auth/auth.context'
import { Button } from '../../common/components/button.component'
import { useConfirm } from '../../common/components/confirm.context'
import { EmptyState, ErrorState, PageLoader } from '../../common/components/feedback.component'
import { SelectInput } from '../../common/components/form-controls.component'
import { Badge, PageHeader } from '../../common/components/page-header.component'
import { useToast } from '../../common/components/toast.context'
import { useAsyncData } from '../../common/hooks/use-async-data'
import { useDocumentTitle } from '../../common/hooks/use-document-title'
import { getErrorMessage } from '../../common/http/http-error'
import { localStore, STORAGE_KEYS } from '../../common/storage/local-storage'
import { cn } from '../../common/utils/classnames'
import { formatDateTime } from '../../common/utils/format'
import { useFaculties } from '../../faculties/hooks/use-faculties'
import { DAY_LABELS, type DayKey } from '../../schedule/schedule.constants'
import { formatParts } from '../../schedule/schedule.utils'
import { changeLogRequests } from '../change-log.requests'
import { CHANGE_LOG_ACTION_LABELS } from '../change-log.types'

/** Վերջին փոփոխությունները։ Ադմինը տեսնում է միայն իր ֆակուլտետինը (սահմանափակված է սերվերում)։ */
export const ChangeLogPage = () => {
  useDocumentTitle('Փոփոխություններ')
  const { isSuperAdmin } = useAuth()
  const confirm = useConfirm()
  const toast = useToast()
  const faculties = useFaculties()
  const [facultyId, setFacultyId] = useState('')
  const [lastSeen] = useState(() => localStore.get<string>(STORAGE_KEYS.CHANGE_LOG_SEEN, ''))
  const { data, error, isLoading, reload } = useAsyncData(
    () => changeLogRequests.list({ facultyId: facultyId || undefined, limit: 200 }),
    [facultyId],
  )

  useEffect(() => {
    if (data?.[0]) localStore.set(STORAGE_KEYS.CHANGE_LOG_SEEN, data[0].createdAt)
  }, [data])

  const facultyNames = new Map(faculties.data?.map((faculty) => [faculty.id, faculty.shortName]))

  const clearAll = async () => {
    const isConfirmed = await confirm({
      title: 'Ջնջե՞լ պատմությունը',
      message: 'Փոփոխությունների ամբողջ պատմությունը կջնջվի։ Դասացուցակը չի փոխվի։',
      confirmText: 'Ջնջել',
      isDanger: true,
    })
    if (!isConfirmed) return
    try {
      await changeLogRequests.clear()
      toast.success('Պատմությունը ջնջվեց')
      void reload()
    } catch (clearError) {
      toast.error(getErrorMessage(clearError))
    }
  }

  return (
    <>
      <PageHeader
        title="Փոփոխությունների պատմություն"
        description="Ով, երբ և ինչ է փոխել դասացուցակում"
        actions={
          isSuperAdmin && (
            <>
              <SelectInput value={facultyId} onChange={(event) => setFacultyId(event.target.value)} className="w-56" aria-label="Ֆակուլտետ">
                <option value="">Բոլոր ֆակուլտետները</option>
                {faculties.data?.map((faculty) => (
                  <option key={faculty.id} value={faculty.id}>
                    {faculty.shortName}
                  </option>
                ))}
              </SelectInput>
              <Button variant="secondary" size="sm" icon={<Trash2 className="size-4" />} onClick={clearAll}>
                Ջնջել պատմությունը
              </Button>
            </>
          )
        }
      />

      {isLoading && !data && <PageLoader />}
      {error && <ErrorState message={error} onRetry={reload} />}
      {data?.length === 0 && <EmptyState icon={<History className="size-10" />} title="Փոփոխություններ դեռ չկան" />}

      <ul className="flex flex-col gap-2">
        {data?.map((entry) => {
          const isNew = Boolean(lastSeen) && entry.createdAt > lastSeen
          const isLesson = entry.action === 'lesson.save' || entry.action === 'lesson.delete'
          return (
            <li
              key={entry.id}
              className={cn(
                'rounded-xl border bg-white p-3 text-sm dark:bg-slate-900',
                isNew ? 'border-brand-300 ring-1 ring-brand-200 dark:border-brand-700 dark:ring-brand-900' : 'border-slate-200 dark:border-slate-800',
              )}
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold">{CHANGE_LOG_ACTION_LABELS[entry.action] ?? entry.action}</span>
                {isNew && <Badge className="bg-brand-600 text-white">Նոր</Badge>}
                <span className="ml-auto text-xs text-slate-400">{formatDateTime(entry.createdAt)}</span>
              </div>
              <p className="mt-0.5 text-xs text-slate-500">
                {entry.userName}
                {entry.facultyId && ` • ${facultyNames.get(entry.facultyId) ?? ''}`}
                {entry.cohortName && ' • '}
                {entry.cohortId && entry.cohortName && (
                  <Link to={APP_ROUTES.admin.editor(entry.cohortId)} className="font-semibold text-brand-600 hover:underline">
                    {entry.cohortName}
                  </Link>
                )}
                {entry.day && ` • ${DAY_LABELS[entry.day as DayKey] ?? entry.day} ${entry.slot}`}
              </p>
              {isLesson && (
                <div className="mt-2 grid gap-1 rounded-lg bg-slate-50 p-2 text-xs dark:bg-slate-800/60">
                  <span className="text-slate-400 line-through">Նախկին՝ {formatParts(entry.before)}</span>
                  <span className="font-medium">Նոր՝ {entry.after ? formatParts(entry.after) : 'ջնջված'}</span>
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </>
  )
}
