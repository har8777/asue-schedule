import { Fragment } from 'react'
import { useSettings } from '../../settings/settings.context'
import { ApprovalBlock } from './approval-block.component'
import { ScheduleSignatures } from './schedule-signatures.component'
import { cn } from '../../common/utils/classnames'
import { DAY_LABELS } from '../schedule.constants'
import { buildOfficialSheet, resolveAcademicYear } from '../schedule.official'
import { lessonKeyId } from '../schedule.utils'
import type { Cohort, Lesson, LessonKey } from '../schedule.types'

interface OfficialScheduleTableProps {
  cohort: Cohort
  lessons: Map<string, Lesson>
  facultyName: string
  /** Ֆակուլտետի կարճ անունը՝ հոսքերի վերնագրերի համար (օր.՝ «Կառավարման»)։ */
  facultyShortName?: string
  /** Ֆակուլտետի դեկանի անունը՝ ստորագրության տողի համար։ */
  deanName?: string
  /** Ֆակուլտետի դեկանի ստորագրությունը՝ data URL։ */
  deanSignature?: string
  isEditable?: boolean
  onCellClick?: (key: LessonKey, lesson: Lesson | undefined) => void
}

const cell = 'border border-slate-400 px-1.5 py-1 align-middle dark:border-slate-500'
const head = 'border border-slate-400 px-1.5 py-1 text-center align-middle font-bold dark:border-slate-500'

/**
 * Պաշտոնական դասացուցակ՝ թղթային ձևաչափով. վերնագիր, հաստատման դաշտ, օրերը
 * ուղղահայաց ձախ սյունակում, հոսքերը՝ «Ժամ / Առարկա / Դասախոսներ / Լսարան»
 * սյունակներով, և ներքևում՝ ստորագրությունների տողերը։
 */
export const OfficialScheduleTable = ({
  cohort,
  lessons,
  facultyName,
  facultyShortName,
  deanName,
  deanSignature,
  isEditable,
  onCellClick,
}: OfficialScheduleTableProps) => {
  const { settings } = useSettings()
  const days = buildOfficialSheet(cohort, lessons)
  const lessonAt = (key: LessonKey) => lessons.get(lessonKeyId(key))
  const streams = cohort.settings.streams
  const academicYear = resolveAcademicYear(settings)

  return (
    <div className="flex flex-col gap-3 text-slate-900 dark:text-slate-100">
      <header className="relative pb-1">
        <div className="text-center">
          <h2 className="text-xl font-extrabold tracking-[0.25em]">ԴԱՍԱՑՈՒՑԱԿ</h2>
          <p className="mt-1 text-sm">{facultyName}ի առկա բակալավրիատի</p>
          <p className="text-sm">
            {academicYear && `${academicYear} ուսումնական `}
            {settings.semesterLabel}ի
          </p>
        </div>
        <div className="mt-2 flex justify-end sm:absolute sm:top-0 sm:right-0 sm:mt-0">
          <ApprovalBlock />
        </div>
      </header>

      <div className="print-table-wrapper overflow-x-auto">
        <table className="w-full border-collapse text-[11px]">
          <thead>
            <tr>
              <th rowSpan={2} className={cn(head, 'bg-brand-600 text-white')}>
                Օր
              </th>
              {streams.map((stream) => (
                <th key={stream.id} colSpan={4} className={cn(head, 'bg-brand-600 text-white')}>
                  {[facultyShortName, cohort.name, stream.name].filter(Boolean).join(' ')}
                </th>
              ))}
            </tr>
            <tr>
              {streams.map((stream) => (
                <Fragment key={stream.id}>
                  <th className={cn(head, 'bg-brand-600 text-white')}>Ժամ</th>
                  <th className={cn(head, 'bg-brand-600 text-white')}>Առարկա</th>
                  <th className={cn(head, 'bg-brand-600 text-white')}>Դասախոսներ</th>
                  <th className={cn(head, 'bg-brand-600 text-white')}>Լսարան</th>
                </Fragment>
              ))}
            </tr>
          </thead>
          <tbody>
            {days.map((block) =>
              block.rows.map((row, rowIndex) => (
                <tr key={`${block.day}-${row.slot}-${row.partIndex}`} className="bg-white dark:bg-slate-950">
                  {rowIndex === 0 && (
                    <td
                      rowSpan={block.rows.length}
                      className={cn(cell, 'w-7 bg-slate-50 p-0 text-center dark:bg-slate-900')}
                    >
                      <span className="inline-block text-[10px] font-bold whitespace-nowrap [writing-mode:vertical-rl] [transform:rotate(180deg)]">
                        {DAY_LABELS[block.day]}
                      </span>
                    </td>
                  )}
                  {row.cells.map((slotCell, streamIndex) => {
                    const stream = streams[streamIndex]
                    const key: LessonKey = { day: block.day, slot: row.slot, streamId: stream.id }
                    const lesson = lessonAt(key)
                    const clickable = isEditable && onCellClick
                    const open = () => onCellClick?.(key, lesson)
                    const cellProps = clickable
                      ? {
                          onClick: open,
                          className: cn(cell, 'cursor-pointer hover:bg-brand-50 dark:hover:bg-slate-800'),
                        }
                      : { className: cell }
                    return (
                      <Fragment key={stream.id}>
                        {row.partIndex === 0 && (
                          <td rowSpan={row.partCount} className={cn(cell, 'w-10 text-center font-semibold')}>
                            {row.slot}
                          </td>
                        )}
                        {slotCell && (
                          <>
                            <td rowSpan={slotCell.rowSpan} {...cellProps}>
                              {slotCell.part?.subject ?? (clickable ? <span className="text-slate-300">+</span> : '')}
                            </td>
                            <td rowSpan={slotCell.rowSpan} {...cellProps}>
                              {slotCell.part?.lecturers.map((name) => (
                                <div key={name}>{name}</div>
                              ))}
                            </td>
                            <td
                              rowSpan={slotCell.rowSpan}
                              {...cellProps}
                              className={cn(cellProps.className, 'w-12 text-center')}
                            >
                              {slotCell.part?.rooms.map((name) => (
                                <div key={name}>{name}</div>
                              ))}
                            </td>
                          </>
                        )}
                      </Fragment>
                    )
                  })}
                </tr>
              )),
            )}
          </tbody>
        </table>
      </div>

      <ScheduleSignatures
        showSignatures={settings.showSignatures}
        lines={[
          {
            label: settings.academicHeadLabel,
            name: settings.academicHeadName,
            signature: settings.academicHeadSignature,
          },
          { label: `${facultyName}ի դեկան`, name: deanName ?? '', signature: deanSignature },
        ]}
      />
    </div>
  )
}
