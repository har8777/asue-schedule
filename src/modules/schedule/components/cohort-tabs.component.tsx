import { NavLink } from 'react-router-dom'
import { cn } from '../../common/utils/classnames'
import type { Cohort } from '../schedule.types'
import { sortCohorts } from '../schedule.utils'

interface CohortTabsProps {
  cohorts: Cohort[]
  buildLink: (cohortId: string) => string
}

/** Ֆակուլտետի կուրսերի և ծրագրերի արագ փոխարկիչ։ */
export const CohortTabs = ({ cohorts, buildLink }: CohortTabsProps) => (
  <nav className="print-hidden scrollbar-thin -mx-1 flex gap-2 overflow-x-auto px-1 pb-1" aria-label="Կուրսեր">
    {sortCohorts(cohorts).map((cohort) => (
      <NavLink
        key={cohort.id}
        to={buildLink(cohort.id)}
        replace
        className={({ isActive }) =>
          cn(
            'shrink-0 rounded-lg px-3 py-2 text-xs font-bold whitespace-nowrap transition-colors',
            isActive
              ? 'bg-brand-600 text-white shadow-sm'
              : cohort.kind === 'program'
                ? 'bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-900'
                : 'bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-300 dark:ring-slate-700',
          )
        }
      >
        {cohort.name}
      </NavLink>
    ))}
  </nav>
)
