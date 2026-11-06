import { ArrowRight, Building2, Clock, UserRound } from 'lucide-react'
import { Link } from 'react-router-dom'
import { APP_ROUTES } from '../../../app/app.routes'
import { ErrorState, PageLoader } from '../../common/components/feedback.component'
import { useDocumentTitle } from '../../common/hooks/use-document-title'
import { localStore, STORAGE_KEYS } from '../../common/storage/local-storage'
import { cn } from '../../common/utils/classnames'
import { sortCohorts } from '../../schedule/schedule.utils'
import { useSettings } from '../../settings/settings.context'
import { useFaculties } from '../hooks/use-faculties'

interface LastCohort {
  cohortId: string
  label: string
}

/** Գլխավոր էջ. ֆակուլտետներ և դրանց կուրսերը՝ մեկ սեղմումով դեպի դասացուցակ։ */
export const FacultiesPage = () => {
  useDocumentTitle(null)
  const { settings } = useSettings()
  const { data: faculties, error, isLoading, reload } = useFaculties()
  const lastCohort = localStore.get<LastCohort | null>(STORAGE_KEYS.LAST_COHORT, null)

  return (
    <>
      <section className="mb-6 rounded-3xl bg-gradient-to-br from-brand-900 to-brand-600 px-5 py-7 text-white shadow-lg sm:px-8 sm:py-10">
        <p className="text-sm font-semibold text-blue-100">{settings.semesterLabel}</p>
        <h1 className="mt-1 text-2xl font-extrabold tracking-tight sm:text-4xl">{settings.universityName} դասացուցակ</h1>
        <p className="mt-2 max-w-xl text-sm text-blue-100 sm:text-base">Ընտրեք ֆակուլտետը և կուրսը՝ շաբաթվա դասացուցակը դիտելու համար։</p>
        <div className="mt-5 flex flex-wrap gap-2">
          {lastCohort && (
            <Link
              to={APP_ROUTES.schedule(lastCohort.cohortId)}
              className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-brand-900 shadow-sm hover:bg-blue-50"
            >
              <Clock className="size-4" />
              {lastCohort.label}
              <ArrowRight className="size-4" />
            </Link>
          )}
          <Link
            to={APP_ROUTES.lecturers}
            className="inline-flex items-center gap-2 rounded-xl bg-white/15 px-4 py-2.5 text-sm font-bold text-white ring-1 ring-white/30 hover:bg-white/25"
          >
            <UserRound className="size-4" />
            Դասախոսի դասացուցակ
          </Link>
        </div>
      </section>

      {isLoading && !faculties && <PageLoader />}
      {error && <ErrorState message={error} onRetry={reload} />}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {faculties?.map((faculty) => (
          <article
            key={faculty.id}
            className="flex flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"
          >
            <div className="mb-3 flex items-start gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700 dark:bg-brand-900/40 dark:text-brand-100">
                <Building2 className="size-5" />
              </span>
              <h2 className="pt-0.5 leading-snug font-bold">{faculty.name}</h2>
            </div>
            <div className="mt-auto flex flex-wrap gap-2">
              {sortCohorts(faculty.cohorts).map((cohort) => (
                <Link
                  key={cohort.id}
                  to={APP_ROUTES.schedule(cohort.id)}
                  className={cn(
                    'rounded-lg px-3 py-2 text-xs font-bold transition-colors',
                    cohort.kind === 'program'
                      ? 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300'
                      : 'bg-slate-100 text-slate-700 hover:bg-brand-600 hover:text-white dark:bg-slate-800 dark:text-slate-200',
                  )}
                >
                  {cohort.name}
                </Link>
              ))}
            </div>
          </article>
        ))}
      </div>
    </>
  )
}
