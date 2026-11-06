import { CircleCheck, RefreshCw } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { APP_ROUTES } from '../../../app/app.routes'
import { useAuth } from '../../auth/auth.context'
import { Button } from '../../common/components/button.component'
import { EmptyState, ErrorState, PageLoader } from '../../common/components/feedback.component'
import { SegmentedControl } from '../../common/components/form-controls.component'
import { PageHeader } from '../../common/components/page-header.component'
import { useAsyncData } from '../../common/hooks/use-async-data'
import { useDocumentTitle } from '../../common/hooks/use-document-title'
import { ConflictList } from '../../schedule/components/conflict-list.component'
import { reportsRequests } from '../reports.requests'

type Scope = 'mine' | 'all'

/** Համալսարանի խաչվող դասերի հաշվետվություն (նույն դասախոսը/լսարանը նույն ժամին)։ */
export const ConflictsPage = () => {
  useDocumentTitle('Խաչվող դասեր')
  const { user, isSuperAdmin } = useAuth()
  const [scope, setScope] = useState<Scope>(isSuperAdmin ? 'all' : 'mine')
  const facultyId = scope === 'mine' ? (user?.facultyId ?? undefined) : undefined
  const { data, error, isLoading, reload } = useAsyncData(() => reportsRequests.conflicts(facultyId), [facultyId])

  return (
    <>
      <PageHeader
        title="Խաչվող դասեր"
        description="Դեպքեր, երբ նույն դասախոսը կամ լսարանը նույն ժամին նշանակված է մի քանի տեղում"
        actions={
          <>
            {!isSuperAdmin && (
              <SegmentedControl<Scope>
                value={scope}
                onChange={setScope}
                options={[
                  { value: 'mine', label: 'Իմ ֆակուլտետը' },
                  { value: 'all', label: 'Ամբողջ համալսարանը' },
                ]}
              />
            )}
            <Button variant="secondary" size="sm" icon={<RefreshCw className="size-4" />} onClick={reload} isLoading={isLoading}>
              Թարմացնել
            </Button>
          </>
        }
      />

      {isLoading && !data && <PageLoader />}
      {error && <ErrorState message={error} onRetry={reload} />}
      {data?.length === 0 && (
        <EmptyState icon={<CircleCheck className="size-10 text-emerald-500" />} title="Խաչվող դասեր չկան" description="Հիանալի է, բախումներ չեն հայտնաբերվել։" />
      )}
      {data && data.length > 0 && (
        <>
          <p className="mb-3 text-sm font-bold text-amber-700 dark:text-amber-300">Հայտնաբերվել է {data.length} բախում</p>
          <ConflictList conflicts={data} showTime />
          <p className="mt-4 text-xs text-slate-500">
            Ուղղելու համար բացեք համապատասխան կուրսը{' '}
            <Link to={APP_ROUTES.admin.dashboard} className="font-semibold text-brand-600 hover:underline">
              վահանակից
            </Link>
            ։
          </p>
        </>
      )}
    </>
  )
}
