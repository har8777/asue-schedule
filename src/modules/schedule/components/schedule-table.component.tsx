import { Plus } from 'lucide-react'
import { Fragment } from 'react'
import { cn } from '../../common/utils/classnames'
import { useSettings } from '../../settings/settings.context'
import { DAY_LABELS } from '../schedule.constants'
import type { Cohort, Lesson, LessonKey } from '../schedule.types'
import { getDaySlots, lessonKeyId } from '../schedule.utils'
import { LessonContent } from './lesson-content.component'

interface ScheduleTableProps {
  cohort: Cohort
  lessons: Map<string, Lesson>
  isEditable?: boolean
  onCellClick?: (key: LessonKey, lesson: Lesson | undefined) => void
}

/** Շաբաթական աղյուսակ. տողերը՝ օրեր և դասաժամեր, սյունակները՝ հոսքեր։ */
export const ScheduleTable = ({ cohort, lessons, isEditable = false, onCellClick }: ScheduleTableProps) => {
  const { settings } = useSettings()
  const { streams, days } = cohort.settings

  return (
    <div className="print-table-wrapper scrollbar-thin overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
      <table className="w-full min-w-[720px] table-fixed border-collapse text-sm">
        <colgroup>
          <col className="w-11" />
          <col className="w-20" />
          {streams.map((stream) => (
            <col key={stream.id} />
          ))}
        </colgroup>
        <thead>
          <tr className="bg-slate-100 text-xs dark:bg-slate-800">
            <th className="border-r border-b border-slate-200 px-1 py-2.5 font-bold dark:border-slate-700">Օր</th>
            <th className="border-r border-b border-slate-200 px-1 py-2.5 font-bold dark:border-slate-700">Ժամ</th>
            {streams.map((stream) => (
              <th key={stream.id} className="border-b border-l border-slate-200 px-2 py-2.5 font-bold dark:border-slate-700">
                {stream.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {days.map((day) => {
            const slots = getDaySlots(cohort.settings, day)
            return (
              <Fragment key={day}>
                {slots.map((slot, slotIndex) => {
                  const isLastSlot = slotIndex === slots.length - 1
                  const time = settings.slotTimes[slot]
                  return (
                    <tr
                      key={`${day}-${slot}`}
                      className={cn(
                        'bg-white dark:bg-slate-900',
                        isLastSlot ? 'border-b-2 border-slate-300 dark:border-slate-600' : 'border-b border-slate-100 dark:border-slate-800',
                      )}
                    >
                      {slotIndex === 0 && (
                        <th
                          rowSpan={slots.length}
                          className="border-r border-slate-200 bg-slate-50 p-1 align-middle dark:border-slate-700 dark:bg-slate-800/60"
                        >
                          <span className="inline-block -rotate-180 text-xs font-bold tracking-wide [writing-mode:vertical-rl]">
                            {DAY_LABELS[day]}
                          </span>
                        </th>
                      )}
                      <td className="border-r border-slate-200 bg-slate-50/60 px-1 py-2 text-center align-middle dark:border-slate-700 dark:bg-slate-800/30">
                        <div className="font-mono text-xs font-bold">{slot}</div>
                        {time && (
                          <div className="text-[10px] leading-tight text-slate-400">
                            {time.start}
                            <br />
                            {time.end}
                          </div>
                        )}
                      </td>
                      {streams.map((stream) => {
                        const key: LessonKey = { day, slot, streamId: stream.id }
                        const lesson = lessons.get(lessonKeyId(key))
                        const content = lesson ? <LessonContent parts={lesson.parts} /> : null
                        return (
                          <td key={stream.id} className="border-l border-slate-100 p-0 align-top dark:border-slate-800">
                            {isEditable ? (
                              <button
                                type="button"
                                onClick={() => onCellClick?.(key, lesson)}
                                className="group flex h-full min-h-16 w-full cursor-pointer items-start p-2 text-left transition-colors hover:bg-brand-50 dark:hover:bg-slate-800"
                                aria-label={`${DAY_LABELS[day]}, ${slot}, ${stream.name}`}
                              >
                                {content ?? (
                                  <Plus className="m-auto size-4 text-slate-300 group-hover:text-brand-500 dark:text-slate-600" />
                                )}
                              </button>
                            ) : (
                              <div className="min-h-14 p-2">{content}</div>
                            )}
                          </td>
                        )
                      })}
                    </tr>
                  )
                })}
              </Fragment>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
