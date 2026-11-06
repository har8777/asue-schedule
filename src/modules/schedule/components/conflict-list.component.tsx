import { DoorOpen, TriangleAlert, UserRound } from 'lucide-react'
import { cn } from '../../common/utils/classnames'
import { DAY_LABELS } from '../schedule.constants'
import type { ScheduleConflict } from '../schedule.types'
import { formatLocation } from '../schedule.utils'

interface ConflictListProps {
  conflicts: ScheduleConflict[]
  /** Ընթացիկ վանդակը, որը պետք չէ ցույց տալ «այլ տեղերի» ցուցակում։ */
  current?: { cohortId: string; streamId: string }
  showTime?: boolean
}

const KIND_LABEL = { lecturer: 'Դասախոս', room: 'Լսարան' } as const

/** Զբաղված լսարանը արգելող սխալ է (հնարավոր չէ պահպանել), մնացածը՝ զգուշացում։ */
export const isBlockingConflict = (conflict: ScheduleConflict): boolean => conflict.kind === 'room' && !conflict.isInternal

export const ConflictList = ({ conflicts, current, showTime = false }: ConflictListProps) => (
  <ul className="flex flex-col gap-2">
    {conflicts.map((conflict, index) => {
      const others = current && !conflict.isInternal
        ? conflict.locations.filter((loc) => !(loc.cohortId === current.cohortId && loc.streamId === current.streamId))
        : conflict.locations
      const Icon = conflict.kind === 'lecturer' ? UserRound : DoorOpen
      const isBlocking = isBlockingConflict(conflict)
      return (
        <li
          key={`${conflict.kind}-${conflict.name}-${index}`}
          className={cn(
            'rounded-xl border p-3 text-sm',
            isBlocking
              ? 'border-red-200 bg-red-50 dark:border-red-900/60 dark:bg-red-950/30'
              : 'border-amber-200 bg-amber-50 dark:border-amber-900/60 dark:bg-amber-950/30',
          )}
        >
          <div
            className={cn(
              'flex flex-wrap items-center gap-2 font-semibold',
              isBlocking ? 'text-red-900 dark:text-red-200' : 'text-amber-900 dark:text-amber-200',
            )}
          >
            <TriangleAlert className="size-4 shrink-0" />
            <Icon className="size-4 shrink-0" />
            <span>
              {KIND_LABEL[conflict.kind]}՝ «{conflict.name}»
            </span>
            {showTime && (
              <span className="rounded-md bg-white/70 px-1.5 py-0.5 text-xs font-bold dark:bg-black/30">
                {DAY_LABELS[conflict.day]} • {conflict.slot}
              </span>
            )}
          </div>
          <p className={cn('mt-1 text-xs', isBlocking ? 'text-red-800 dark:text-red-300' : 'text-amber-800 dark:text-amber-300')}>
            {conflict.isInternal
              ? 'Կրկնվում է նույն վանդակի մի քանի մասում (նույն ժամին չի կարող լինել երկու տեղում)։'
              : isBlocking
                ? 'Լսարանը զբաղված է։ Ընտրեք այլ լսարան․ այս ժամին այն արդեն նշանակված է՝'
                : 'Նույն ժամին արդեն նշանակված է՝'}
          </p>
          {!conflict.isInternal && (
            <ul className="mt-1.5 flex flex-col gap-1">
              {others.map((location, locationIndex) => (
                <li
                  key={locationIndex}
                  className="rounded-md bg-white/80 px-2 py-1 text-xs font-medium text-slate-700 dark:bg-slate-900/60 dark:text-slate-300"
                >
                  {formatLocation(location)}
                </li>
              ))}
            </ul>
          )}
        </li>
      )
    })}
  </ul>
)
