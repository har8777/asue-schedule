import { Rows3, Table2 } from 'lucide-react'
import { useState } from 'react'
import { SegmentedControl } from '../../common/components/form-controls.component'
import { useIsDesktop } from '../../common/hooks/use-media-query'
import { cn } from '../../common/utils/classnames'
import type { Cohort, Lesson, LessonKey } from '../schedule.types'
import { ScheduleDayView } from './schedule-day-view.component'
import { ScheduleTable } from './schedule-table.component'

export const SCHEDULE_EXPORT_ELEMENT_ID = 'schedule-export'

type MobileView = 'days' | 'table'

interface ScheduleBoardProps {
  cohort: Cohort
  title: string
  subtitle?: string
  lessons: Map<string, Lesson>
  isEditable?: boolean
  onCellClick?: (key: LessonKey, lesson: Lesson | undefined) => void
}

/**
 * Ընտրում է տեսքը ըստ էկրանի. համակարգչում՝ աղյուսակ, հեռախոսում՝ օրերով քարտեր
 * (հնարավորությամբ անցնել աղյուսակի)։ Աղյուսակը միշտ առկա է PDF-ի և տպման համար։
 */
export const ScheduleBoard = ({ cohort, title, subtitle, lessons, isEditable, onCellClick }: ScheduleBoardProps) => {
  const isDesktop = useIsDesktop()
  const [mobileView, setMobileView] = useState<MobileView>('days')
  const showDays = !isDesktop && mobileView === 'days'

  return (
    <div className="flex flex-col gap-3">
      {!isDesktop && (
        <SegmentedControl<MobileView>
          className="print-hidden self-start"
          value={mobileView}
          onChange={setMobileView}
          options={[
            { value: 'days', label: <><Rows3 className="size-3.5" /> Օրերով</> },
            { value: 'table', label: <><Table2 className="size-3.5" /> Աղյուսակ</> },
          ]}
        />
      )}

      {showDays && <ScheduleDayView cohort={cohort} lessons={lessons} isEditable={isEditable} onCellClick={onCellClick} />}

      <div id={SCHEDULE_EXPORT_ELEMENT_ID} className={cn('bg-white dark:bg-slate-950', showDays && 'hidden print:block')}>
        <div className="print-only hidden pb-2">
          <h2 className="text-lg font-bold">{title}</h2>
          {subtitle && <p className="text-sm">{subtitle}</p>}
        </div>
        <ScheduleTable cohort={cohort} lessons={lessons} isEditable={isEditable} onCellClick={onCellClick} />
      </div>
    </div>
  )
}
