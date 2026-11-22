import { BookOpen, Plus, Trash2 } from 'lucide-react'
import { Controller, useForm } from 'react-hook-form'
import { Button } from '../../common/components/button.component'
import { ComboboxInput } from '../../common/components/combobox-input.component'
import { EmptyState } from '../../common/components/feedback.component'
import { SelectInput, TextInput } from '../../common/components/form-controls.component'
import { cn } from '../../common/utils/classnames'
import type { CohortStream } from '../../schedule/schedule.types'
import {
  describeHours,
  entriesForHours,
  formatEntries,
  MAX_SUBJECT_HOURS,
  MIN_SUBJECT_HOURS,
  SUGGESTED_HOURS,
} from '../curriculum.constants'
import type { PlanSubject, SubjectUsage } from '../curriculum.types'

interface AddSubjectForm {
  subject: string
  hours: string
}

interface PlanSubjectsEditorProps {
  subjects: PlanSubject[]
  usage: SubjectUsage[]
  streams: CohortStream[]
  canEdit: boolean
  suggestions: string[]
  onAdd: (subject: string, hours: number) => Promise<void>
  onRemove: (subject: string) => void
}

/** Առարկաների ցուցակը ժամաքանակով և հոսքերում լրացվածի ցուցիչով։ */
export const PlanSubjectsEditor = ({
  subjects,
  usage,
  streams,
  canEdit,
  suggestions,
  onAdd,
  onRemove,
}: PlanSubjectsEditorProps) => {
  const { register, control, handleSubmit, reset, setValue, watch, formState } = useForm<AddSubjectForm>({
    defaultValues: { subject: '', hours: String(SUGGESTED_HOURS[1]) },
  })
  const usageBySubject = new Map(usage.map((item) => [item.subject, item]))
  const hoursValue = watch('hours')
  const previewEntries = Number(hoursValue) > 0 ? entriesForHours(Number(hoursValue)) : 0

  const submit = handleSubmit(async ({ subject, hours }) => {
    await onAdd(subject.trim(), Number(hours))
    reset({ subject: '', hours })
  })

  return (
    <>
      {canEdit && (
        <form onSubmit={submit} className="mb-4 flex flex-col gap-2 sm:flex-row" noValidate>
          <div className="relative flex-1">
            <Controller
              control={control}
              name="subject"
              rules={{ required: true, maxLength: 200 }}
              render={({ field }) => (
                <ComboboxInput
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  options={suggestions}
                  placeholder="Դասընթացի անվանում"
                  hasError={Boolean(formState.errors.subject)}
                />
              )}
            />
          </div>
          <div className="flex gap-2 sm:w-64">
            <TextInput
              type="number"
              min={MIN_SUBJECT_HOURS}
              max={MAX_SUBJECT_HOURS}
              step={1}
              className="w-24"
              aria-label="Ժամաքանակ"
              hasError={Boolean(formState.errors.hours)}
              {...register('hours', {
                required: true,
                min: MIN_SUBJECT_HOURS,
                max: MAX_SUBJECT_HOURS,
                valueAsNumber: false,
              })}
            />
            <SelectInput
              className="flex-1"
              aria-label="Ընտրել ժամաքանակ"
              value={SUGGESTED_HOURS.includes(Number(hoursValue)) ? String(hoursValue) : ''}
              onChange={(event) => event.target.value && setValue('hours', event.target.value)}
            >
              <option value="">Ձեռքով</option>
              {SUGGESTED_HOURS.map((hours) => (
                <option key={hours} value={hours}>
                  {hours} ժամ — {formatEntries(entriesForHours(hours))} մուտք
                </option>
              ))}
            </SelectInput>
          </div>
          <Button type="submit" icon={<Plus className="size-4" />} isLoading={formState.isSubmitting}>
            Ավելացնել
          </Button>
        </form>
      )}
      {canEdit && previewEntries > 0 && (
        <p className="mb-4 -mt-2 text-xs text-slate-500 dark:text-slate-400">
          {hoursValue} ժամ = {formatEntries(previewEntries)} շաբաթական մուտք (ժամաքանակ ÷ 2 ÷ 16)
        </p>
      )}

      {subjects.length === 0 ? (
        <EmptyState
          icon={<BookOpen className="size-10" />}
          title="Դասընթացներ դեռ չկան"
          description={canEdit ? 'Ավելացրեք դասընթաց և նշեք կիսամյակային ժամաքանակը։' : undefined}
        />
      ) : (
        <ul className="grid gap-2">
          {subjects.map((item) => {
            const subjectUsage = usageBySubject.get(item.subject)
            const limit = entriesForHours(item.hours)
            return (
              <li
                key={item.subject}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 dark:border-slate-800 dark:bg-slate-900"
              >
                <div className="flex items-center gap-2">
                  <BookOpen className="size-4 shrink-0 text-slate-400" />
                  <span className="min-w-0 flex-1 truncate font-semibold">{item.subject}</span>
                  <span className="shrink-0 rounded-md bg-brand-50 px-2 py-1 text-xs font-bold text-brand-700 dark:bg-brand-900/40 dark:text-brand-100">
                    {item.hours} ժամ
                  </span>
                  {canEdit && (
                    <button
                      type="button"
                      onClick={() => onRemove(item.subject)}
                      className="cursor-pointer rounded p-1 text-slate-300 hover:text-red-600"
                      aria-label={`Հեռացնել ${item.subject}`}
                    >
                      <Trash2 className="size-4" />
                    </button>
                  )}
                </div>
                <p className="mt-1 pl-6 text-xs text-slate-500 dark:text-slate-400">{describeHours(item.hours)}</p>
                {subjectUsage && streams.length > 0 && (
                  <ul className="mt-2 flex flex-wrap gap-1.5 pl-6">
                    {streams.map((stream) => {
                      const used = subjectUsage.usedByStream[stream.id] ?? 0
                      const isFull = used >= limit - 0.001
                      return (
                        <li
                          key={stream.id}
                          className={cn(
                            'rounded-md px-2 py-0.5 text-[11px] font-semibold',
                            used === 0
                              ? 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                              : isFull
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300'
                                : 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300',
                          )}
                        >
                          {stream.name}՝ {formatEntries(used)}/{formatEntries(limit)}
                        </li>
                      )
                    })}
                  </ul>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </>
  )
}
