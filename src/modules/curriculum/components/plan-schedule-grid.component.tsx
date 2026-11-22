import { RotateCcw } from 'lucide-react'
import { SelectInput, TextInput } from '../../common/components/form-controls.component'
import { cn } from '../../common/utils/classnames'
import { ALLOWED_DAY_STARTS, DAY_KEYS, DAY_LABELS, SLOT_KEYS, type DayKey, type SlotKey } from '../../schedule/schedule.constants'
import { useSettings } from '../../settings/settings.context'
import type { PlanContent } from '../curriculum.types'

interface PlanScheduleGridProps {
  content: PlanContent
  canEdit: boolean
  onChange: (patch: Partial<PlanContent>) => void
}

/** Շաբաթվա օրերը, օրվա առաջին դասաժամը և դասաժամերի ժամերը՝ տվյալ կուրսի համար։ */
export const PlanScheduleGrid = ({ content, canEdit, onChange }: PlanScheduleGridProps) => {
  const { settings } = useSettings()

  const toggleDay = (day: DayKey) => {
    const days = content.days.includes(day) ? content.days.filter((item) => item !== day) : [...content.days, day]
    if (days.length === 0) return
    onChange({ days: DAY_KEYS.filter((item) => days.includes(item)) })
  }

  const setDayStart = (day: DayKey, slot: SlotKey) => {
    const daySlotStart = { ...content.daySlotStart }
    if (slot === '1-2') delete daySlotStart[day]
    else daySlotStart[day] = slot
    onChange({ daySlotStart })
  }

  const setSlotTime = (slot: SlotKey, field: 'start' | 'end', value: string) => {
    const current = content.slotTimes[slot] ?? settings.slotTimes[slot]
    onChange({ slotTimes: { ...content.slotTimes, [slot]: { ...current, [field]: value } } })
  }

  const resetSlotTime = (slot: SlotKey) => {
    const slotTimes = { ...content.slotTimes }
    delete slotTimes[slot]
    onChange({ slotTimes })
  }

  return (
    <div className="grid gap-5">
      <section>
        <h3 className="mb-2 text-sm font-bold">Շաբաթվա օրերը</h3>
        <div className="flex flex-wrap gap-2">
          {DAY_KEYS.map((day) => {
            const isActive = content.days.includes(day)
            return (
              <button
                key={day}
                type="button"
                disabled={!canEdit}
                onClick={() => toggleDay(day)}
                className={cn(
                  'rounded-lg px-3 py-2 text-xs font-bold transition-colors',
                  canEdit ? 'cursor-pointer' : 'cursor-default',
                  isActive
                    ? 'bg-brand-600 text-white'
                    : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400',
                )}
              >
                {DAY_LABELS[day]}
              </button>
            )
          })}
        </div>
      </section>

      <section>
        <h3 className="mb-2 text-sm font-bold">Օրվա առաջին դասաժամը</h3>
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {content.days.map((day) => (
            <label key={day} className="flex items-center gap-2 text-sm">
              <span className="w-24 shrink-0 text-slate-500 dark:text-slate-400">{DAY_LABELS[day]}</span>
              <SelectInput
                value={content.daySlotStart[day] ?? '1-2'}
                disabled={!canEdit}
                onChange={(event) => setDayStart(day, event.target.value as SlotKey)}
                aria-label={`${DAY_LABELS[day]}՝ առաջին դասաժամ`}
              >
                {ALLOWED_DAY_STARTS.map((slot) => (
                  <option key={slot} value={slot}>
                    {slot}
                  </option>
                ))}
              </SelectInput>
            </label>
          ))}
        </div>
      </section>

      <section>
        <h3 className="mb-1 text-sm font-bold">Դասաժամերի ժամերը</h3>
        <p className="mb-2 text-xs text-slate-500 dark:text-slate-400">
          Լրացրեք միայն այն ժամերը, որոնք այս կուրսում տարբերվում են ընդհանուր կարգավորումներից։
        </p>
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {SLOT_KEYS.map((slot) => {
            const override = content.slotTimes[slot]
            const time = override ?? settings.slotTimes[slot]
            return (
              <div key={slot} className="flex items-center gap-1.5 text-sm">
                <span
                  className={cn(
                    'w-12 shrink-0 font-semibold',
                    override ? 'text-brand-700 dark:text-brand-300' : 'text-slate-500 dark:text-slate-400',
                  )}
                >
                  {slot}
                </span>
                <TextInput
                  type="time"
                  value={time.start}
                  disabled={!canEdit}
                  onChange={(event) => setSlotTime(slot, 'start', event.target.value)}
                  aria-label={`${slot} սկիզբ`}
                />
                <TextInput
                  type="time"
                  value={time.end}
                  disabled={!canEdit}
                  onChange={(event) => setSlotTime(slot, 'end', event.target.value)}
                  aria-label={`${slot} ավարտ`}
                />
                {canEdit && override && (
                  <button
                    type="button"
                    onClick={() => resetSlotTime(slot)}
                    className="cursor-pointer rounded p-1 text-slate-300 hover:text-brand-600"
                    aria-label={`${slot}՝ վերադարձնել ընդհանուր ժամը`}
                  >
                    <RotateCcw className="size-4" />
                  </button>
                )}
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}
