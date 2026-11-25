import { Fragment } from 'react'
import { cn } from '../../common/utils/classnames'
import { useSettings } from '../../settings/settings.context'
import { buildOfficialRows, collectSlots, formatDate } from '../schedule.calendar'
import { resolveAcademicYear } from '../schedule.official'
import type { Cohort, Lesson, LessonKey } from '../schedule.types'
import { lessonKeyId } from '../schedule.utils'
import { AsueLetterhead } from './asue-letterhead.component'
import { ScheduleSignatures } from './schedule-signatures.component'

interface PartTimeScheduleTableProps {
  cohort: Cohort
  lessons: Map<string, Lesson>
  streamId: string
  facultyName: string
  deanName?: string
  /** Ֆակուլտետի դեկանի ստորագրությունը՝ data URL։ */
  deanSignature?: string
  isEditable?: boolean
  onCellClick?: (key: LessonKey, lesson: Lesson | undefined) => void
}

const border = 'border border-slate-400 dark:border-slate-500'
const head = `${border} bg-brand-600 px-1 py-1 text-center align-middle font-bold text-white`
const cell = `${border} px-1 py-0.5 align-middle leading-tight`
/** Չօգտագործվող դասաժամի սյունակները ստվերվում են՝ ինչպես թղթային տարբերակում։ */
const muted = 'bg-slate-200 dark:bg-slate-800'

/**
 * Հեռակա բակալավրիատի դասացուցակ՝ ՀՊՏՀ-ի թղթային ձևաչափով։
 *
 * Ձախից՝ «Շաբաթ» (շաբաթվա համարը, միավորված իր օրերի վրա) և «Օրեր» (իրական
 * ամսաթվերը), աջից՝ «Ժամեր»՝ յուրաքանչյուր դասաժամ «Առարկա / Դասախոս / Լսարան»
 * ենթասյունակներով։ Վերնագրից հետո գալիս է սյունակների համարակալման տողը։
 */
export const PartTimeScheduleTable = ({
  cohort,
  lessons,
  streamId,
  facultyName,
  deanName,
  deanSignature,
  isEditable,
  onCellClick,
}: PartTimeScheduleTableProps) => {
  const { settings } = useSettings()
  const slots = collectSlots(cohort)
  const rows = buildOfficialRows({ cohort, lessons, streamId, settings, slots })
  const streamName = cohort.settings.streams.find((stream) => stream.id === streamId)?.name ?? ''
  const academicYear = resolveAcademicYear(settings).replace('-', '/')
  const columnCount = 2 + slots.length * 3

  // Ամբողջովին դատարկ դասաժամի սյունակները ստվերվում են
  const emptySlots = new Set(
    slots.filter((slot) => rows.every((row) => !row.cells.find((item) => item.slot === slot)?.part)),
  )

  const subtitle = [
    `${facultyName}ի`,
    academicYear && `${academicYear} ուս. տարվա`,
    settings.semesterLabel,
    'հեռակա բակալավրիատ',
    cohort.settings.programName,
    cohort.name,
    streamName,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className="flex flex-col text-slate-900 dark:text-slate-100">
      <AsueLetterhead subtitle={subtitle} />

      {!settings.semesterStartDate && (
        <p className="print-hidden mb-2 rounded-lg bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
          Ամսաթվերը ցուցադրելու համար «Կարգավորումներ» բաժնում նշեք կիսամյակի սկիզբը։
        </p>
      )}

      <div className="print-table-wrapper overflow-x-auto">
        <table className="w-full border-collapse text-[10px]">
          <thead>
            <tr>
              <th rowSpan={3} className={cn(head, 'w-8')}>
                <span className="inline-block [writing-mode:vertical-rl] [transform:rotate(180deg)]">Շաբաթ</span>
              </th>
              <th rowSpan={3} className={cn(head, 'w-20')}>
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
                  <th className={cn(head, 'w-6 px-0')}>
                    <span className="inline-block [writing-mode:vertical-rl] [transform:rotate(180deg)]">Լսարան</span>
                  </th>
                </Fragment>
              ))}
            </tr>
            {/* Սյունակների համարակալումը՝ ինչպես թղթային ձևում */}
            <tr className="bg-slate-200 dark:bg-slate-800">
              {Array.from({ length: columnCount }, (_, index) => (
                <th key={index} className={cn(border, 'px-1 py-0 text-center text-[9px] font-normal')}>
                  {index + 1}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={`${row.week}-${row.day}`} className="bg-white dark:bg-slate-950">
                {row.weekRowSpan > 0 && (
                  <td rowSpan={row.weekRowSpan} className={cn(cell, 'bg-brand-600 text-center font-bold text-white')}>
                    {row.week}
                  </td>
                )}
                <td className={cn(cell, muted, 'text-center whitespace-nowrap')}>
                  {row.date ? formatDate(row.date) : ''}
                </td>
                {row.cells.map((slotCell) => {
                  const key: LessonKey = { day: row.day, slot: slotCell.slot, streamId }
                  const lesson = lessons.get(lessonKeyId(key))
                  const isMuted = emptySlots.has(slotCell.slot)
                  const clickable = isEditable && onCellClick
                  const base = cn(cell, isMuted && muted, clickable && 'cursor-pointer hover:bg-brand-50')
                  const props = clickable ? { onClick: () => onCellClick?.(key, lesson), className: base } : { className: base }
                  return (
                    <Fragment key={slotCell.slot}>
                      <td {...props}>{slotCell.part?.subject ?? ''}</td>
                      <td {...props}>
                        {slotCell.part?.lecturers.map((name) => (
                          <div key={name}>{name}</div>
                        ))}
                      </td>
                      <td {...props} className={cn(base, 'px-0 text-center')}>
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

      <ScheduleSignatures
        showSignatures={settings.showSignatures}
        lines={[
          {
            label: settings.partTimeHeadLabel,
            name: settings.partTimeHeadName,
            signature: settings.partTimeHeadSignature,
          },
          { label: `${facultyName}ի դեկան`, name: deanName ?? '', signature: deanSignature },
        ]}
      />
    </div>
  )
}
