import { Pencil, Plus, Trash2, UserRound } from 'lucide-react'
import { useState } from 'react'
import { ROLE_LABELS, USER_ROLES } from '../../auth/auth.constants'
import { useAuth } from '../../auth/auth.context'
import { Button } from '../../common/components/button.component'
import { useConfirm } from '../../common/components/confirm.context'
import { ErrorState, PageLoader } from '../../common/components/feedback.component'
import { Badge, PageHeader } from '../../common/components/page-header.component'
import { useToast } from '../../common/components/toast.context'
import { useAsyncData } from '../../common/hooks/use-async-data'
import { useDocumentTitle } from '../../common/hooks/use-document-title'
import { getErrorMessage } from '../../common/http/http-error'
import { cn } from '../../common/utils/classnames'
import { useFaculties } from '../../faculties/hooks/use-faculties'
import { UserFormModal } from '../components/user-form-modal.component'
import { usersRequests } from '../users.requests'
import type { User } from '../users.types'

/** Օգտատերերի կառավարում (միայն գլխավոր ադմինիստրատոր)։ */
export const UsersPage = () => {
  useDocumentTitle('Օգտատերեր')
  const { user: currentUser } = useAuth()
  const toast = useToast()
  const confirm = useConfirm()
  const faculties = useFaculties()
  const { data, error, isLoading, reload } = useAsyncData(() => usersRequests.list(), [])
  const [editing, setEditing] = useState<User | null>(null)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const facultyNames = new Map(faculties.data?.map((faculty) => [faculty.id, faculty.name]))

  const openForm = (user: User | null) => {
    setEditing(user)
    setIsFormOpen(true)
  }

  const toggleActive = async (user: User) => {
    try {
      await usersRequests.update(user.id, { isActive: !user.isActive })
      toast.success(user.isActive ? 'Հաշիվը ապաակտիվացվեց' : 'Հաշիվը ակտիվացվեց')
      void reload()
    } catch (toggleError) {
      toast.error(getErrorMessage(toggleError))
    }
  }

  const remove = async (user: User) => {
    const isConfirmed = await confirm({
      title: `Ջնջե՞լ «${user.username}»-ին`,
      message: 'Օգտատերը այլևս չի կարողանա մուտք գործել։ Նրա կատարած փոփոխությունները կմնան։',
      confirmText: 'Ջնջել',
      isDanger: true,
    })
    if (!isConfirmed) return
    try {
      await usersRequests.remove(user.id)
      toast.success('Օգտատերը ջնջվեց')
      void reload()
    } catch (removeError) {
      toast.error(getErrorMessage(removeError))
    }
  }

  return (
    <>
      <PageHeader
        title="Օգտատերեր"
        description="Ֆակուլտետի ադմինը կարող է խմբագրել միայն իր ֆակուլտետի դասացուցակը"
        actions={
          <Button icon={<Plus className="size-4" />} onClick={() => openForm(null)}>
            Նոր օգտատեր
          </Button>
        }
      />

      {isLoading && !data && <PageLoader />}
      {error && <ErrorState message={error} onRetry={reload} />}

      <ul className="grid gap-3 lg:grid-cols-2">
        {data?.map((user) => (
          <li
            key={user.id}
            className={cn(
              'flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900',
              !user.isActive && 'opacity-60',
            )}
          >
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
              <UserRound className="size-5 text-slate-500" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-semibold">
                {user.displayName} <span className="font-mono text-xs text-slate-400">@{user.username}</span>
              </p>
              <div className="mt-1 flex flex-wrap gap-1.5">
                <Badge className={user.role === USER_ROLES.SUPER_ADMIN ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200' : ''}>
                  {ROLE_LABELS[user.role]}
                </Badge>
                {user.facultyId && <Badge>{facultyNames.get(user.facultyId) ?? '—'}</Badge>}
                {!user.isActive && <Badge className="bg-red-100 text-red-700">Ապաակտիվ</Badge>}
              </div>
              {user.id !== currentUser?.id && (
                <button type="button" onClick={() => toggleActive(user)} className="mt-2 cursor-pointer text-xs font-semibold text-brand-600 hover:underline">
                  {user.isActive ? 'Ապաակտիվացնել' : 'Ակտիվացնել'}
                </button>
              )}
            </div>
            <div className="flex gap-1">
              <Button variant="ghost" size="icon" onClick={() => openForm(user)} aria-label="Խմբագրել">
                <Pencil className="size-4" />
              </Button>
              {user.id !== currentUser?.id && (
                <Button variant="ghost" size="icon" className="text-red-500" onClick={() => remove(user)} aria-label="Ջնջել">
                  <Trash2 className="size-4" />
                </Button>
              )}
            </div>
          </li>
        ))}
      </ul>

      <UserFormModal isOpen={isFormOpen} user={editing} faculties={faculties.data ?? []} onClose={() => setIsFormOpen(false)} onSaved={reload} />
    </>
  )
}
