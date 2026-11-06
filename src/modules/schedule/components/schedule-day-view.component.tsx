import { Pencil, Plus } from 'lucide-react'
import { useEffect, useState } from 'react'
import { localStore, STORAGE_KEYS } from '../../common/storage/local-storage'
import { cn } from '../../common/utils/classnames'
import { useSettings } from '../../settings/settings.context'
import { DAY_LABELS, DAY_SHORT_LABELS, type DayKey } from '../schedule.constants'
import type { Cohort, Lesson, LessonKey } from '../schedule.types'
import { getDaySlots, lessonKeyId, pickInitialDay } from '../schedule.utils'
import { LessonContent } from './lesson-content.component'

interface ScheduleDayViewProps {
  cohort: Cohort
  lessons: Map<string, Lesson>
  isEditable?: boolean
  onCellClick?: (key: LessonKey, lesson: Lesson | undefined) => void
}

const chipClass = (isActive: boolean) =>
  cn(
    'shrink-0 cursor-pointer rounded-full px-3.5 py-1.5 text-xs font-bold transition-colors',
    isActive
      ? 'bg-brand-600 text-white shadow-sm'
      : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-300 dark:ring-slate-700',
  )

/** Բջջային տեսք. ընտրված հոսքի մեկ օրվա դասերը քարտերով։ Հոսքը հիշվում է հաջորդ այցի համար։ */
export const ScheduleDayView = ({ cohort, lessons, isEditable = false, onCellClick }: ScheduleDayViewProps) => {
  const { settings } = useSettings()
  const { streams, days } = cohort.settings
  const streamStorageKey = `${STORAGE_KEYS.STREAM_PREFIX}${cohort.id}`

  const [day, setDay] = useState<DayKey>(() => pickInitialDay(days))
  const [streamId, setStreamId] = useState<string>(() => {
    const stored = localStore.get<string | null>(streamStorageKey, null)
    return streams.some((stream) => stream.id === stored) ? (stored as string) : streams[0]?.id
  })

  useEffect(() => {
    if (!days.includes(day)) setDay(pickInitialDay(days))
    if (!streams.some((stream) => stream.id === streamId)) setStreamId(streams[0]?.id)
  }, [days, streams, day, streamId])

  const selectStream = (id: string) => {
    setStreamId(id)
    localStore.set(streamStorageKey, id)
  }

  const slots = getDaySlots(cohort.settings, day)

  return (
    <div className="flex flex-col gap-3">
      {streams.length > 1 && (
        <div className="scrollbar-thin -mx-1 flex gap-2 overflow-x-auto px-1 pb-1" role="tablist" aria-label="Հոսք">
          {streams.map((stream) => (
            <button key={stream.id} type="button" onClick={() => selectStream(stream.id)} className={chipClass(stream.id === streamId)}>
              {stream.name}
            </button>
          ))}
        </div>
      )}

      <div
        className="grid gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800"
        style={{ gridTemplateColumns: `repeat(${days.length}, minmax(0, 1fr))` }}
        role="tablist"
        aria-label="Օր"
      >
        {days.map((dayKey) => (
          <button
            key={dayKey}
            type="button"
            role="tab"
            aria-selected={dayKey === day}
            onClick={() => setDay(dayKey)}
            className={cn(
              'cursor-pointer rounded-lg py-2 text-xs font-bold transition-colors',
              dayKey === day
                ? 'bg-white text-brand-700 shadow-sm dark:bg-slate-700 dark:text-white'
                : 'text-slate-500 dark:text-slate-400',
            )}
          >
            {DAY_SHORT_LABELS[dayKey]}
          </button>
        ))}
      </div>

      <h3 className="px-1 text-sm font-bold text-slate-500">{DAY_LABELS[day]}</h3>

      <ul className="flex flex-col gap-2">
        {slots.map((slot) => {
          const key: LessonKey = { day, slot, streamId }
          const lesson = lessons.get(lessonKeyId(key))
          const time = settings.slotTimes[slot]
          const body = (
            <>
              <div className="flex w-16 shrink-0 flex-col items-center justify-center border-r border-slate-100 py-2 dark:border-slate-800">
                <span className="font-mono text-sm font-bold">{slot}</span>
                {time && (
                  <span className="text-[10px] text-slate-400">
                    {time.start}–{time.end}
                  </span>
                )}
              </div>
              <div className="min-w-0 flex-1 px-3 py-2.5">
                {lesson ? (
                  <LessonContent parts={lesson.parts} size="md" />
                ) : (
                  <span className="text-sm text-slate-400">Դաս չկա</span>
                )}
              </div>
              {isEditable && (
                <span className="flex items-center pr-3 text-slate-300 dark:text-slate-600">
                  {lesson ? <Pencil className="size-4" /> : <Plus className="size-4" />}
                </span>
              )}
            </>
          )
          const cardClass = cn(
            'flex w-full items-stretch rounded-xl border bg-white text-left shadow-sm dark:bg-slate-900',
            lesson ? 'border-slate-200 dark:border-slate-800' : 'border-dashed border-slate-200 opacity-80 dark:border-slate-800',
          )
          return (
            <li key={slot}>
              {isEditable ? (
                <button type="button" onClick={() => onCellClick?.(key, lesson)} className={cn(cardClass, 'cursor-pointer active:scale-[0.99]')}>
                  {body}
                </button>
              ) : (
                <div className={cardClass}>{body}</div>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
