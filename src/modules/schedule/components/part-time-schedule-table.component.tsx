import { Fragment } from 'react'
import { cn } from '../../common/utils/classnames'
import { useSettings } from '../../settings/settings.context'
import { buildOfficialRows, collectSlots, formatDate } from '../schedule.calendar'
import { resolveAcademicYear } from '../schedule.official'
import type { Cohort, Lesson, LessonKey } from '../schedule.types'
import { lessonKeyId } from '../schedule.utils'

interface PartTimeScheduleTableProps {
  cohort: Cohort
  lessons: Map<string, Lesson>
  streamId: string
  facultyName: string
  deanName?: string
  isEditable?: boolean
  onCellClick?: (key: LessonKey, lesson: Lesson | undefined) => void
}

const cell = 'border border-slate-400 px-1.5 py-1 align-middle dark:border-slate-500'
const head = 'border border-slate-400 bg-brand-600 px-1.5 py-1 text-center align-middle font-bold text-white'

/**
 * Հեռակա բակալավրիատի դասացուցակ՝ ՀՊՏՀ-ի ձևաչափով։ Տողերում՝ շաբաթների
 * համարները և իրական ամսաթվերը, սյունակներում՝ դասաժամերը՝ «Առարկա / Դասախոս /
 * Լսարան» ենթասյունակներով։ Մեկ աղյուսակ՝ մեկ հոսքի համար։
 */
export const PartTimeScheduleTable = ({
  cohort,
  lessons,
  streamId,
  facultyName,
  deanName,
  isEditable,
  onCellClick,
}: PartTimeScheduleTableProps) => {
  const { settings } = useSettings()
  const slots = collectSlots(cohort)
  const rows = buildOfficialRows({ cohort, lessons, streamId, settings, slots })
  const streamName = cohort.settings.streams.find((stream) => stream.id === streamId)?.name ?? ''
  const academicYear = resolveAcademicYear(settings)

  return (
    <div className="flex flex-col gap-3 text-slate-900 dark:text-slate-100">
      <header className="relative pb-1">
        <div className="text-center">
          <h2 className="text-xl font-extrabold tracking-[0.25em]">ԴԱՍԱՑՈՒՑԱԿ</h2>
          <p className="mt-1 text-xs">
            {facultyName}ի {academicYear && `${academicYear} ուս. տարվա `}
            {settings.semesterLabel} հեռակա բակալավրիատ {cohort.name} {streamName}
          </p>
        </div>
        {(settings.approverName || settings.approverTitle) && (
          <div className="mt-2 text-right text-[11px] leading-relaxed sm:absolute sm:top-0 sm:right-0 sm:mt-0">
            <p className="font-bold">ՀԱՍՏԱՏՈՒՄ ԵՄ</p>
            <p className="font-semibold">
              {settings.approverTitle} {settings.approverName}
            </p>
            {settings.approvalDate && <p className="text-slate-500">{settings.approvalDate}</p>}
          </div>
        )}
      </header>

      {!settings.semesterStartDate && (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
          Ամսաթվերը ցուցադրելու համար «Կարգավորումներ» բաժնում նշեք կիսամյակի սկիզբը։
        </p>
      )}

      <div className="print-table-wrapper overflow-x-auto">
        <table className="w-full border-collapse text-[11px]">
          <thead>
            <tr>
              <th rowSpan={3} className={cn(head, 'w-8')}>
                Շաբաթ
              </th>
              <th rowSpan={3} className={cn(head, 'w-24')}>
                Օրեր
              </th>
              <th colSpan={slots.length * 3} className={head}>
                Ժամեր
              </th>
            </tr>
            <tr>
              {slots.map((slot) => (
                <th key={slot} colSpan={3} className={head}>
                  {slot}
                </th>
              ))}
            </tr>
            <tr>
              {slots.map((slot) => (
                <Fragment key={slot}>
                  <th className={head}>Առարկա</th>
                  <th className={head}>Դասախոս</th>
                  <th className={cn(head, 'w-10')}>Լսարան</th>
                </Fragment>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={`${row.week}-${row.day}`} className="bg-white dark:bg-slate-950">
                {row.weekRowSpan > 0 && (
                  <td
                    rowSpan={row.weekRowSpan}
                    className={cn(cell, 'bg-brand-600 text-center font-bold text-white')}
                  >
                    {row.week}
                  </td>
                )}
                <td className={cn(cell, 'text-center whitespace-nowrap')}>
                  {row.date ? formatDate(row.date) : ''}
                </td>
                {row.cells.map((slotCell) => {
                  const key: LessonKey = { day: row.day, slot: slotCell.slot, streamId }
                  const lesson = lessons.get(lessonKeyId(key))
                  const clickable = isEditable && onCellClick
                  const props = clickable
                    ? {
                        onClick: () => onCellClick?.(key, lesson),
                        className: cn(cell, 'cursor-pointer hover:bg-brand-50 dark:hover:bg-slate-800'),
                      }
                    : { className: cell }
                  return (
                    <Fragment key={slotCell.slot}>
                      <td {...props}>
                        {slotCell.part?.subject ?? (clickable ? <span className="text-slate-300">+</span> : '')}
                      </td>
                      <td {...props}>
                        {slotCell.part?.lecturers.map((name) => (
                          <div key={name}>{name}</div>
                        ))}
                      </td>
                      <td {...props} className={cn(props.className, 'text-center')}>
                        {slotCell.part?.rooms.map((name) => (
                          <div key={name}>{name}</div>
                        ))}
                      </td>
                    </Fragment>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {(settings.partTimeHeadName || deanName) && (
        <footer className="mt-3 flex flex-col gap-2 text-[11px]">
          {settings.partTimeHeadName && (
            <p>
              <span className="font-semibold">{settings.partTimeHeadLabel}՝</span>
              <span className="ml-6">{settings.partTimeHeadName}</span>
            </p>
          )}
          {deanName && (
            <p>
              <span className="font-semibold">{facultyName}ի դեկան՝</span>
              <span className="ml-6">{deanName}</span>
            </p>
          )}
        </footer>
      )}
    </div>
  )
}
