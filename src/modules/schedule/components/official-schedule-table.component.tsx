import { Fragment } from 'react'
import { useSettings } from '../../settings/settings.context'
import { cn } from '../../common/utils/classnames'
import { buildOfficialRows, collectSlots, formatDate } from '../schedule.calendar'
import { DAY_LABELS } from '../schedule.constants'
import type { Cohort, Lesson } from '../schedule.types'

interface OfficialScheduleTableProps {
  cohort: Cohort
  lessons: Map<string, Lesson>
  streamId: string
  facultyName: string
  title?: string
}

const cellClass = 'border border-slate-300 px-1.5 py-1 align-top dark:border-slate-600'
const headClass = 'border border-slate-300 px-1.5 py-1 text-center font-bold dark:border-slate-600'

/**
 * Պաշտոնական ձև (ՀՊՏՀ). տողերում՝ շաբաթներ և ամսաթվեր, սյունակներում՝ դասաժամերը՝
 * Առարկա / Դասախոս / Լսարան ենթասյունակներով։ Մեկ աղյուսակ՝ մեկ հոսքի համար։
 */
export const OfficialScheduleTable = ({
  cohort,
  lessons,
  streamId,
  facultyName,
  title,
}: OfficialScheduleTableProps) => {
  const { settings } = useSettings()
  const slots = collectSlots(cohort)
  const rows = buildOfficialRows({ cohort, lessons, streamId, settings, slots })
  const streamName = cohort.settings.streams.find((stream) => stream.id === streamId)?.name ?? streamId

  return (
    <div className="flex flex-col gap-2">
      <div className="text-center">
        <h2 className="text-base font-extrabold tracking-[0.3em] uppercase">Դասացուցակ</h2>
        <p className="text-sm font-bold">{facultyName}</p>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {title ?? cohort.name} • {streamName} • {settings.semesterLabel}
        </p>
      </div>

      {!settings.semesterStartDate && (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
          Ամսաթվերը ցուցադրելու համար «Կարգավորումներ» բաժնում նշեք կիսամյակի սկիզբը։
        </p>
      )}

      <div className="print-table-wrapper overflow-x-auto">
        <table className="w-full border-collapse text-[11px]">
          <thead>
            <tr className="bg-slate-100 dark:bg-slate-800">
              <th rowSpan={2} className={headClass}>
                Շաբաթներ
              </th>
              <th rowSpan={2} className={headClass}>
                Օրեր
              </th>
              {slots.map((slot) => (
                <th key={slot} colSpan={3} className={headClass}>
                  {slot}
                  <span className="ml-1 font-normal text-slate-500">
                    {settings.slotTimes[slot]?.start}–{settings.slotTimes[slot]?.end}
                  </span>
                </th>
              ))}
            </tr>
            <tr className="bg-slate-50 dark:bg-slate-900">
              {slots.map((slot) => (
                <Fragment key={slot}>
                  <th className={headClass}>Առարկա</th>
                  <th className={headClass}>Դասախոս</th>
                  <th className={headClass}>Լսարան</th>
                </Fragment>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={`${row.week}-${row.day}`}
                className={cn(
                  'bg-white dark:bg-slate-950',
                  row.weekRowSpan > 0 && 'border-t-2 border-slate-400 dark:border-slate-500',
                )}
              >
                {row.weekRowSpan > 0 && (
                  <td rowSpan={row.weekRowSpan} className={cn(cellClass, 'text-center font-bold')}>
                    {row.week}
                  </td>
                )}
                <td className={cn(cellClass, 'whitespace-nowrap')}>
                  <span className="font-semibold">{row.date ? formatDate(row.date) : DAY_LABELS[row.day]}</span>
                  {row.date && (
                    <span className="ml-1 text-slate-400">{DAY_LABELS[row.day].slice(0, 3)}</span>
                  )}
                </td>
                {row.cells.map((cell) => (
                  <Fragment key={cell.slot}>
                    <td className={cellClass}>{cell.part?.subject ?? ''}</td>
                    <td className={cellClass}>
                      {cell.part?.lecturers.map((name) => (
                        <div key={name}>{name}</div>
                      ))}
                    </td>
                    <td className={cn(cellClass, 'text-center')}>
                      {cell.part?.rooms.map((name) => (
                        <div key={name}>{name}</div>
                      ))}
                    </td>
                  </Fragment>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
