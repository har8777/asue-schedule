import type { ReactNode } from 'react'
import { Badge } from '../../common/components/page-header.component'
import { useSettings } from '../../settings/settings.context'
import type { Cohort } from '../schedule.types'
import { CohortTabs } from './cohort-tabs.component'

interface ScheduleHeaderProps {
  facultyName: string
  cohortName: string
  cohorts: Cohort[]
  buildLink: (cohortId: string) => string
  actions?: ReactNode
}

export const ScheduleHeader = ({ facultyName, cohortName, cohorts, buildLink, actions }: ScheduleHeaderProps) => {
  const { settings } = useSettings()
  return (
    <div className="mb-4 flex flex-col gap-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-slate-500 sm:text-sm">{facultyName}</p>
          <h1 className="flex flex-wrap items-center gap-2 text-xl font-bold tracking-tight sm:text-2xl">
            {cohortName}
            {settings.semesterLabel && <Badge className="bg-brand-50 text-brand-700 dark:bg-brand-900/40 dark:text-brand-100">{settings.semesterLabel}</Badge>}
          </h1>
        </div>
        {actions && <div className="print-hidden flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
      {cohorts.length > 1 && <CohortTabs cohorts={cohorts} buildLink={buildLink} />}
    </div>
  )
}
