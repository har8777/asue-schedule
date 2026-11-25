import { FileText, Rows3, Table2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { SegmentedControl, SelectInput } from '../../common/components/form-controls.component'
import { useIsDesktop } from '../../common/hooks/use-media-query'
import { cn } from '../../common/utils/classnames'
import type { Cohort, Lesson, LessonKey } from '../schedule.types'
import { OfficialScheduleTable } from './official-schedule-table.component'
import { PartTimeScheduleTable } from './part-time-schedule-table.component'
import { ScheduleDayView } from './schedule-day-view.component'
import { ScheduleTable } from './schedule-table.component'

export const SCHEDULE_EXPORT_ELEMENT_ID = 'schedule-export'

/** «days»՝ օրերով քարտեր (հեռախոս), «table»՝ շաբաթական աղյուսակ, «official»՝ ՀՊՏՀ-ի ձևաչափ։ */
export type ScheduleView = 'days' | 'table' | 'official'

interface ScheduleBoardProps {
  cohort: Cohort
  facultyName: string
  title: string
  subtitle?: string
  lessons: Map<string, Lesson>
  isEditable?: boolean
  /** Ֆակուլտետի կարճ անունը՝ պաշտոնական ձևի հոսքերի վերնագրերում։ */
  facultyShortName?: string
  /** Ֆակուլտետի դեկանը՝ պաշտոնական ձևի ստորագրության տողում։ */
  deanName?: string
  /** Ֆակուլտետի դեկանի ստորագրությունը՝ data URL։ */
  deanSignature?: string
  /** Ո՞ր տեսքով բացվի (խմբագրիչում՝ աղյուսակ, հանրային էջում՝ պաշտոնական)։ */
  defaultView?: ScheduleView
  onCellClick?: (key: LessonKey, lesson: Lesson | undefined) => void
}

/**
 * Դասացուցակի ցուցադրում երեք տեսքով։ Արտահանումը (PDF, տպում) վերցնում է հենց
 * ընտրված տեսքը, ուստի պաշտոնական ձևը ստացվում է և՛ էկրանին, և՛ ֆայլում։
 */
export const ScheduleBoard = ({
  cohort,
  facultyName,
  title,
  subtitle,
  lessons,
  isEditable,
  facultyShortName,
  deanName,
  deanSignature,
  defaultView = 'table',
  onCellClick,
}: ScheduleBoardProps) => {
  const isDesktop = useIsDesktop()
  const [view, setView] = useState<ScheduleView>(defaultView)
  const [streamId, setStreamId] = useState(cohort.settings.streams[0]?.id ?? '')
  // Հեռակա ուսուցման դասացուցակը կազմվում է մեկ հոսքի համար՝ առանձին թերթով
  const isPartTime = cohort.studyForm === 'part_time'

  useEffect(() => {
    if (!cohort.settings.streams.some((stream) => stream.id === streamId)) {
      setStreamId(cohort.settings.streams[0]?.id ?? '')
    }
  }, [cohort, streamId])

  // Հեռախոսում «Օրերով» տեսքը ավելի հարմար է, համակարգչում՝ ավելորդ
  const options = [
    ...(isDesktop ? [] : [{ value: 'days' as const, label: (<><Rows3 className="size-3.5" /> Օրերով</>) }]),
    { value: 'table' as const, label: (<><Table2 className="size-3.5" /> Շաբաթական</>) },
    { value: 'official' as const, label: (<><FileText className="size-3.5" /> Պաշտոնական</>) },
  ]
  const activeView = !isDesktop || view !== 'days' ? view : 'table'

  return (
    <div className="flex flex-col gap-3">
      <div className="print-hidden flex flex-wrap items-center gap-2">
        <SegmentedControl<ScheduleView> className="self-start" value={activeView} onChange={setView} options={options} />
        {activeView === 'official' && isPartTime && cohort.settings.streams.length > 1 && (
          <SelectInput
            value={streamId}
            onChange={(event) => setStreamId(event.target.value)}
            className="sm:w-48"
            aria-label="Հոսք"
          >
            {cohort.settings.streams.map((stream) => (
              <option key={stream.id} value={stream.id}>
                {stream.name}
              </option>
            ))}
          </SelectInput>
        )}
      </div>

      {activeView === 'days' && (
        <ScheduleDayView cohort={cohort} lessons={lessons} isEditable={isEditable} onCellClick={onCellClick} />
      )}

      <div
        id={SCHEDULE_EXPORT_ELEMENT_ID}
        className={cn('bg-white dark:bg-slate-950', activeView === 'days' && 'hidden print:block')}
      >
        <div className="print-only hidden pb-2">
          <h2 className="text-lg font-bold">{title}</h2>
          {subtitle && <p className="text-sm">{subtitle}</p>}
        </div>
        {activeView === 'official' && isPartTime ? (
          <PartTimeScheduleTable
            cohort={cohort}
            lessons={lessons}
            streamId={streamId}
            facultyName={facultyName}
            deanName={deanName}
            deanSignature={deanSignature}
            isEditable={isEditable}
            onCellClick={onCellClick}
          />
        ) : activeView === 'official' ? (
          <OfficialScheduleTable
            cohort={cohort}
            lessons={lessons}
            facultyName={facultyName}
            facultyShortName={facultyShortName}
            deanName={deanName}
            deanSignature={deanSignature}
            isEditable={isEditable}
            onCellClick={onCellClick}
          />
        ) : (
          <ScheduleTable cohort={cohort} lessons={lessons} isEditable={isEditable} onCellClick={onCellClick} />
        )}
      </div>
    </div>
  )
}
