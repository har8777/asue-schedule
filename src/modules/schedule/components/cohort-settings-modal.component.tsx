import { Plus, Trash2 } from 'lucide-react'
import { useEffect } from 'react'
import { useFieldArray, useForm, useWatch } from 'react-hook-form'
import { Button } from '../../common/components/button.component'
import { useConfirm } from '../../common/components/confirm.context'
import { FormField, SelectInput, TextInput } from '../../common/components/form-controls.component'
import { Modal } from '../../common/components/modal.component'
import { useToast } from '../../common/components/toast.context'
import { getErrorMessage } from '../../common/http/http-error'
import { ordinalLabel } from '../../common/utils/format'
import { useSettings } from '../../settings/settings.context'
import {
  ALLOWED_DAY_STARTS,
  DAY_KEYS,
  DAY_LABELS,
  MAX_STREAMS,
  MIN_STREAMS,
  type DayKey,
  type SlotKey,
} from '../schedule.constants'
import { scheduleRequests } from '../schedule.requests'
import type { Cohort, CohortSettings, CohortStream, Lesson } from '../schedule.types'
import { buildDaySlots, countLessonsOutsideGrid } from '../schedule.utils'

interface CohortSettingsForm {
  name: string
  streams: CohortStream[]
  days: Record<DayKey, boolean>
  daySlotStart: Record<DayKey, SlotKey>
}

interface CohortSettingsModalProps {
  isOpen: boolean
  cohort: Cohort
  lessons: Lesson[]
  onClose: () => void
  onSaved: (cohort: Cohort) => void
  onCleared: () => void
  onDeleted: () => void
}

const toFormValues = (cohort: Cohort): CohortSettingsForm => ({
  name: cohort.name,
  streams: cohort.settings.streams.map((stream) => ({ ...stream })),
  days: Object.fromEntries(DAY_KEYS.map((day) => [day, cohort.settings.days.includes(day)])) as Record<DayKey, boolean>,
  daySlotStart: Object.fromEntries(DAY_KEYS.map((day) => [day, cohort.settings.daySlotStart[day] ?? '1-2'])) as Record<
    DayKey,
    SlotKey
  >,
})

const nextStreamId = (streams: CohortStream[]): string => {
  const maxNumber = Math.max(0, ...streams.map((stream) => Number(stream.id.replace('stream-', '')) || 0))
  return `stream-${maxNumber + 1}`
}

/** Կուրսի աղյուսակի կառուցվածքը. հոսքեր, շաբաթվա օրեր և օրվա առաջին դասաժամը։ */
export const CohortSettingsModal = ({ isOpen, cohort, lessons, onClose, onSaved, onCleared, onDeleted }: CohortSettingsModalProps) => {
  const toast = useToast()
  const confirm = useConfirm()
  const { settings: publicSettings } = useSettings()
  const { control, register, handleSubmit, reset, formState } = useForm<CohortSettingsForm>({ defaultValues: toFormValues(cohort) })
  const { fields, append, remove } = useFieldArray({ control, name: 'streams' })
  const days = useWatch({ control, name: 'days' })
  const starts = useWatch({ control, name: 'daySlotStart' })

  useEffect(() => {
    if (isOpen) reset(toFormValues(cohort))
  }, [isOpen, cohort, reset])

  const onSubmit = async (values: CohortSettingsForm) => {
    const selectedDays = DAY_KEYS.filter((day) => values.days[day])
    if (selectedDays.length === 0) {
      toast.error('Ընտրեք առնվազն մեկ օր')
      return
    }
    const settings: CohortSettings = {
      streams: values.streams.map((stream) => ({ id: stream.id, name: stream.name.trim() })),
      days: selectedDays,
      daySlotStart: Object.fromEntries(
        selectedDays.filter((day) => values.daySlotStart[day] !== '1-2').map((day) => [day, values.daySlotStart[day]]),
      ),
    }

    const removedCount = countLessonsOutsideGrid(lessons, settings)
    if (removedCount > 0) {
      const isConfirmed = await confirm({
        title: 'Որոշ դասեր կջնջվեն',
        isDanger: true,
        confirmText: 'Պահպանել և ջնջել',
        message: `Նոր կառուցվածքում ${removedCount} դաս այլևս տեղ չունի (հեռացված հոսք, օր կամ դասաժամ) և կջնջվի։ Շարունակե՞լ։`,
      })
      if (!isConfirmed) return
    }

    try {
      const result = await scheduleRequests.updateCohort(cohort.id, { name: values.name.trim(), settings })
      onSaved(result.cohort)
      toast.success(result.removedLessons ? `Պահպանվեց։ Ջնջվեց ${result.removedLessons} դաս։` : 'Կարգավորումները պահպանվեցին')
      onClose()
    } catch (error) {
      toast.error(getErrorMessage(error))
    }
  }

  const clearCohort = async () => {
    const isConfirmed = await confirm({
      title: 'Մաքրե՞լ դասացուցակը',
      isDanger: true,
      confirmText: 'Մաքրել',
      message: `«${cohort.name}»-ի բոլոր ${lessons.length} դասերը կջնջվեն։ Այս գործողությունը հնարավոր չէ հետարկել։`,
    })
    if (!isConfirmed) return
    try {
      await scheduleRequests.clearCohort(cohort.id)
      toast.success('Դասացուցակը մաքրվեց')
      onCleared()
      onClose()
    } catch (error) {
      toast.error(getErrorMessage(error))
    }
  }

  const deleteCohort = async () => {
    const isConfirmed = await confirm({
      title: 'Ջնջե՞լ կուրսը',
      isDanger: true,
      confirmText: 'Ջնջել',
      message: `«${cohort.name}»-ը և նրա ամբողջ դասացուցակը կջնջվեն։ Այս գործողությունը հնարավոր չէ հետարկել։`,
    })
    if (!isConfirmed) return
    try {
      await scheduleRequests.deleteCohort(cohort.id)
      toast.success('Կուրսը ջնջվեց')
      onDeleted()
    } catch (error) {
      toast.error(getErrorMessage(error))
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="lg"
      title="Կուրսի կարգավորումներ"
      description="Հոսքեր, օրեր և դասաժամեր"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Չեղարկել
          </Button>
          <Button type="submit" form="cohort-settings-form" isLoading={formState.isSubmitting}>
            Պահպանել
          </Button>
        </>
      }
    >
      <form id="cohort-settings-form" onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6" noValidate>
        <FormField label="Անվանում" error={formState.errors.name?.message}>
          <TextInput {...register('name', { required: 'Մուտքագրեք անվանումը', maxLength: { value: 80, message: 'Առավելագույնը 80 նիշ' } })} />
        </FormField>

        <section>
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-bold">
              Հոսքեր <span className="font-mono text-xs text-slate-400">({fields.length}/{MAX_STREAMS})</span>
            </h3>
            <Button
              variant="secondary"
              size="sm"
              icon={<Plus className="size-4" />}
              disabled={fields.length >= MAX_STREAMS}
              onClick={() => append({ id: nextStreamId(fields), name: `${ordinalLabel(fields.length + 1)} հոսք` })}
            >
              Ավելացնել
            </Button>
          </div>
          <div className="flex flex-col gap-2">
            {fields.map((field, index) => (
              <div key={field.id} className="flex items-center gap-2">
                <TextInput
                  aria-label={`Հոսք ${index + 1}`}
                  {...register(`streams.${index}.name`, { required: true, maxLength: 60 })}
                  hasError={Boolean(formState.errors.streams?.[index]?.name)}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  disabled={fields.length <= MIN_STREAMS}
                  onClick={() => remove(index)}
                  aria-label="Հեռացնել հոսքը"
                  className="text-red-500"
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h3 className="mb-2 text-sm font-bold">Օրեր և առաջին դասաժամ</h3>
          <div className="flex flex-col divide-y divide-slate-100 rounded-xl border border-slate-200 dark:divide-slate-800 dark:border-slate-700">
            {DAY_KEYS.map((day) => {
              const slots = buildDaySlots(starts?.[day] ?? '1-2')
              return (
                <div key={day} className="flex flex-wrap items-center gap-3 px-3 py-2.5">
                  <label className="flex min-w-36 flex-1 cursor-pointer items-center gap-2 text-sm font-semibold">
                    <input type="checkbox" className="size-4 accent-brand-600" {...register(`days.${day}`)} />
                    {DAY_LABELS[day]}
                  </label>
                  {days?.[day] && (
                    <div className="flex items-center gap-2">
                      <SelectInput className="h-9 w-24 font-mono" aria-label="Առաջին դասաժամ" {...register(`daySlotStart.${day}`)}>
                        {ALLOWED_DAY_STARTS.map((slot) => (
                          <option key={slot} value={slot}>
                            {slot}
                          </option>
                        ))}
                      </SelectInput>
                      <span className="hidden text-xs text-slate-400 sm:inline">
                        {publicSettings.slotTimes[slots[0]]?.start}–{publicSettings.slotTimes[slots.at(-1) ?? slots[0]]?.end}
                      </span>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </section>

        <section className="rounded-xl border border-red-200 p-4 dark:border-red-900/60">
          <h3 className="text-sm font-bold text-red-700 dark:text-red-300">Վտանգավոր գործողություններ</h3>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button variant="secondary" size="sm" onClick={clearCohort} disabled={lessons.length === 0}>
              Մաքրել դասացուցակը
            </Button>
            <Button variant="danger" size="sm" onClick={deleteCohort}>
              Ջնջել կուրսը
            </Button>
          </div>
        </section>
      </form>
    </Modal>
  )
}
