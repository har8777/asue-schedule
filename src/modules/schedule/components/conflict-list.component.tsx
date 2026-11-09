import { DoorOpen, TriangleAlert, UserRound } from 'lucide-react'
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

/** Բախումների ցուցակ։ Բոլոր բախումներն արգելող են. նման դասը հնարավոր չէ պահպանել։ */
export const ConflictList = ({ conflicts, current, showTime = false }: ConflictListProps) => (
  <ul className="flex flex-col gap-2">
    {conflicts.map((conflict, index) => {
      const others =
        current && !conflict.isInternal
          ? conflict.locations.filter((loc) => !(loc.cohortId === current.cohortId && loc.streamId === current.streamId))
          : conflict.locations
      const Icon = conflict.kind === 'lecturer' ? UserRound : DoorOpen
      return (
        <li
          key={`${conflict.kind}-${conflict.name}-${index}`}
          className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm dark:border-red-900/60 dark:bg-red-950/30"
        >
          <div className="flex flex-wrap items-center gap-2 font-semibold text-red-900 dark:text-red-200">
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
          <p className="mt-1 text-xs text-red-800 dark:text-red-300">
            {conflict.isInternal
              ? 'Կրկնվում է նույն վանդակի մի քանի մասում։ Եթե երկու մասում էլ նույն դասն է, ընտրեք «Սովորական դաս»։'
              : `${conflict.kind === 'room' ? 'Լսարանը' : 'Դասախոսը'} այս ժամին արդեն զբաղված է՝`}
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
