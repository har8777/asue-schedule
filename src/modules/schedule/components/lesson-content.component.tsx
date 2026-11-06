import { DoorOpen, UserRound } from 'lucide-react'
import { cn } from '../../common/utils/classnames'
import { partLabel } from '../schedule.constants'
import type { LessonPart } from '../schedule.types'

interface LessonContentProps {
  parts: LessonPart[]
  size?: 'sm' | 'md'
}

const PART_COLORS = [
  'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200',
  'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-200',
]

/** Դասի բովանդակությունը՝ առարկա, դասախոս(ներ), լսարան(ներ)։ Բաժանված դասի մասերը ցուցադրվում են իրար տակ։ */
export const LessonContent = ({ parts, size = 'sm' }: LessonContentProps) => {
  const isSplit = parts.length > 1
  return (
    <div className={cn('flex flex-col', isSplit && 'divide-y divide-dashed divide-slate-200 dark:divide-slate-700')}>
      {parts.map((part, index) => (
        <div key={index} className={cn('flex flex-col gap-0.5 text-left', isSplit && 'py-1 first:pt-0 last:pb-0')}>
          {isSplit && (
            <span
              className={cn(
                'w-fit rounded px-1.5 py-px text-[10px] font-bold',
                PART_COLORS[index] ?? 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
              )}
            >
              {partLabel(index)}
            </span>
          )}
          {part.subject ? (
            <>
              <span className={cn('leading-snug font-semibold', size === 'sm' ? 'text-xs' : 'text-sm')}>{part.subject}</span>
              {part.lecturers.length > 0 && (
                <span className="flex items-start gap-1 text-[11px] leading-snug text-slate-500 dark:text-slate-400">
                  <UserRound className="mt-px size-3 shrink-0" aria-hidden />
                  {part.lecturers.join(', ')}
                </span>
              )}
              {part.rooms.length > 0 && (
                <span className="flex items-center gap-1 text-[11px] font-bold text-brand-700 dark:text-brand-100">
                  <DoorOpen className="size-3 shrink-0" aria-hidden />
                  <span className="font-mono">{part.rooms.join(', ')}</span>
                </span>
              )}
            </>
          ) : (
            <span className="text-xs text-slate-400">—</span>
          )}
        </div>
      ))}
    </div>
  )
}
