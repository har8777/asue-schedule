import { LoaderCircle, Plus, Trash2, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Controller, useFieldArray, useForm, useWatch } from 'react-hook-form'
import type { FacultyCatalog } from '../../catalog/catalog.types'
import { Button } from '../../common/components/button.component'
import { useConfirm } from '../../common/components/confirm.context'
import { FormField, SegmentedControl, TextInput } from '../../common/components/form-controls.component'
import { Modal } from '../../common/components/modal.component'
import { TagInput } from '../../common/components/tag-input.component'
import { useToast } from '../../common/components/toast.context'
import { getApiError, getErrorMessage } from '../../common/http/http-error'
import { useConflictCheck } from '../hooks/use-conflict-check'
import { DAY_LABELS, MAX_LESSON_PARTS, partLabel } from '../schedule.constants'
import { scheduleRequests } from '../schedule.requests'
import type { Cohort, Lesson, LessonKey, LessonPart, ScheduleConflict } from '../schedule.types'
import { ConflictList, isBlockingConflict } from './conflict-list.component'

type LessonMode = 'single' | 'split'

interface LessonFormValues {
  mode: LessonMode
  parts: LessonPart[]
}

export interface LessonEditTarget {
  key: LessonKey
  lesson: Lesson | undefined
}

interface LessonEditorModalProps {
  cohort: Cohort
  catalog: FacultyCatalog
  target: LessonEditTarget | null
  onClose: () => void
  /** Կանչվում է հաջող պահպանումից/ջնջումից հետո՝ նախկին և նոր արժեքներով (undo-ի համար)։ */
  onChanged: (key: LessonKey, before: LessonPart[] | null, after: Lesson | null) => void
}

const EMPTY_PART: LessonPart = { subject: '', lecturers: [], rooms: [] }

const toFormValues = (lesson: Lesson | undefined): LessonFormValues => {
  const parts = lesson?.parts.length ? lesson.parts : [EMPTY_PART]
  return { mode: parts.length > 1 ? 'split' : 'single', parts: parts.map((part) => ({ ...part })) }
}

const cleanParts = (parts: LessonPart[]): LessonPart[] =>
  parts.map((part) => {
    const subject = part.subject.trim()
    return subject ? { subject, lecturers: part.lecturers, rooms: part.rooms } : { ...EMPTY_PART }
  })

export const LessonEditorModal = ({ cohort, catalog, target, onClose, onChanged }: LessonEditorModalProps) => {
  const toast = useToast()
  const confirm = useConfirm()
  const [isDeleting, setIsDeleting] = useState(false)
  const { control, register, handleSubmit, reset, setValue, setError, formState } = useForm<LessonFormValues>({
    defaultValues: toFormValues(undefined),
  })
  const { fields, append, remove } = useFieldArray({ control, name: 'parts' })
  const mode = useWatch({ control, name: 'mode' })
  const watchedParts = useWatch({ control, name: 'parts' }) ?? []

  useEffect(() => {
    if (target) reset(toFormValues(target.lesson))
  }, [target, reset])

  const { conflicts, isChecking } = useConflictCheck(cohort.id, target?.key ?? null, cleanParts(watchedParts))

  const suggestions = useMemo(
    () => ({
      subjects: catalog.subjects.map((item) => item.name),
      lecturers: catalog.lecturers.map((item) => item.name),
      rooms: catalog.rooms.map((item) => item.name),
    }),
    [catalog],
  )

  if (!target) return null
  const { key, lesson } = target
  const stream = cohort.settings.streams.find((item) => item.id === key.streamId)
  const hasBlockingConflict = conflicts.some(isBlockingConflict)

  const changeMode = (nextMode: LessonMode) => {
    setValue('mode', nextMode)
    if (nextMode === 'split' && fields.length < 2) append({ ...EMPTY_PART })
    if (nextMode === 'single' && fields.length > 1) remove(fields.map((_, index) => index).slice(1))
  }

  const confirmConflicts = (found: ScheduleConflict[]) =>
    confirm({
      title: 'Հայտնաբերվել են բախումներ',
      isDanger: true,
      confirmText: 'Պահպանել միևնույն է',
      message: (
        <div className="flex flex-col gap-3">
          <p>Նույն ժամին նույն դասախոսը կամ լսարանը արդեն զբաղված է։ Ցանկանո՞ւմ եք պահպանել։</p>
          <ConflictList conflicts={found} current={{ cohortId: cohort.id, streamId: key.streamId }} />
        </div>
      ),
    })

  const save = async (parts: LessonPart[], force: boolean): Promise<void> => {
    try {
      const result = await scheduleRequests.saveLesson(cohort.id, { ...key, parts, force })
      onChanged(key, lesson?.parts ?? null, result.lesson)
      toast.success(force ? 'Պահպանվեց (բախումներով)' : 'Դասը պահպանվեց')
      onClose()
    } catch (error) {
      const apiError = getApiError<{ conflicts: ScheduleConflict[] }>(error)
      if (apiError?.code === 'ROOM_OCCUPIED') {
        // Զբաղված լսարանը հնարավոր չէ հաստատել. միայն տեղեկացնում ենք
        toast.error(apiError.message)
        return
      }
      if (apiError?.code === 'CONFLICT' && apiError.details?.conflicts && !force) {
        if (await confirmConflicts(apiError.details.conflicts)) await save(parts, true)
        return
      }
      toast.error(getErrorMessage(error))
    }
  }

  const onSubmit = async (values: LessonFormValues) => {
    const parts = cleanParts(values.parts)
    if (parts.every((part) => !part.subject)) {
      setError('parts.0.subject', { message: 'Լրացրեք առնվազն մեկ առարկա կամ ջնջեք դասը' })
      return
    }
    await save(parts, false)
  }

  const deleteLesson = async () => {
    const isConfirmed = await confirm({
      title: 'Ջնջե՞լ դասը',
      message: `${DAY_LABELS[key.day]}, ${key.slot}, ${stream?.name ?? ''}։ Այս գործողությունը կարող եք հետարկել «Հետարկել» կոճակով։`,
      confirmText: 'Ջնջել',
      isDanger: true,
    })
    if (!isConfirmed) return
    setIsDeleting(true)
    try {
      await scheduleRequests.deleteLesson(cohort.id, key)
      onChanged(key, lesson?.parts ?? null, null)
      toast.success('Դասը ջնջվեց')
      onClose()
    } catch (error) {
      toast.error(getErrorMessage(error))
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <Modal
      isOpen
      onClose={onClose}
      size="lg"
      title={lesson ? 'Խմբագրել դասը' : 'Նոր դաս'}
      description={`${DAY_LABELS[key.day]} • ${key.slot} • ${stream?.name ?? ''}`}
      footer={
        <>
          {lesson && (
            <Button
              variant="ghost"
              className="mr-auto text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40"
              icon={<Trash2 className="size-4" />}
              isLoading={isDeleting}
              onClick={deleteLesson}
            >
              Ջնջել
            </Button>
          )}
          <Button variant="secondary" onClick={onClose}>
            Չեղարկել
          </Button>
          <Button
            type="submit"
            form="lesson-editor-form"
            isLoading={formState.isSubmitting}
            disabled={hasBlockingConflict}
            title={hasBlockingConflict ? 'Լսարանը զբաղված է' : undefined}
          >
            Պահպանել
          </Button>
        </>
      }
    >
      <form id="lesson-editor-form" onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
        <SegmentedControl<LessonMode>
          value={mode}
          onChange={changeMode}
          className="w-full"
          options={[
            { value: 'single', label: 'Սովորական դաս' },
            { value: 'split', label: 'Համարիչ / Հայտարար' },
          ]}
        />

        {fields.map((field, index) => {
          const hasSubject = Boolean(watchedParts[index]?.subject?.trim())
          return (
            <fieldset
              key={field.id}
              className="flex flex-col gap-3 rounded-xl border border-slate-200 p-3 sm:p-4 dark:border-slate-700"
            >
              {mode === 'split' && (
                <legend className="flex items-center gap-2 px-1 text-xs font-bold text-slate-500">
                  {partLabel(index)}
                  {index >= 2 && (
                    <button
                      type="button"
                      onClick={() => remove(index)}
                      className="cursor-pointer text-red-500 hover:text-red-700"
                      aria-label="Հեռացնել մասը"
                    >
                      <X className="size-3.5" />
                    </button>
                  )}
                </legend>
              )}
              <FormField label="Առարկա" error={formState.errors.parts?.[index]?.subject?.message}>
                <TextInput
                  list="lesson-subjects"
                  placeholder="Ընտրեք կամ գրեք առարկան"
                  autoComplete="off"
                  {...register(`parts.${index}.subject`)}
                />
              </FormField>
              <div className="grid gap-3 sm:grid-cols-2">
                <FormField label="Դասախոս(ներ)" hint={hasSubject ? 'Enter՝ ավելացնելու համար' : 'Նախ ընտրեք առարկան'}>
                  <Controller
                    control={control}
                    name={`parts.${index}.lecturers`}
                    render={({ field: tagField }) => (
                      <TagInput
                        value={tagField.value}
                        onChange={tagField.onChange}
                        suggestions={suggestions.lecturers}
                        placeholder="Դասախոս"
                        disabled={!hasSubject}
                      />
                    )}
                  />
                </FormField>
                <FormField label="Լսարան(ներ)" hint={hasSubject ? 'Ցուցակում չեղած լսարանը ժամանակավոր է՝ միայն այս դասի համար' : undefined}>
                  <Controller
                    control={control}
                    name={`parts.${index}.rooms`}
                    render={({ field: tagField }) => (
                      <TagInput
                        value={tagField.value}
                        onChange={tagField.onChange}
                        suggestions={suggestions.rooms}
                        placeholder="Լսարան"
                        disabled={!hasSubject}
                        unknownLabel="ժամանակավոր"
                      />
                    )}
                  />
                </FormField>
              </div>
            </fieldset>
          )
        })}

        {mode === 'split' && fields.length < MAX_LESSON_PARTS && (
          <Button variant="ghost" size="sm" className="self-start" icon={<Plus className="size-4" />} onClick={() => append({ ...EMPTY_PART })}>
            Ավելացնել մաս
          </Button>
        )}

        <datalist id="lesson-subjects">
          {suggestions.subjects.map((subject) => (
            <option key={subject} value={subject} />
          ))}
        </datalist>

        {isChecking && (
          <p className="flex items-center gap-2 text-xs text-slate-400">
            <LoaderCircle className="size-3.5 animate-spin" /> Ստուգվում են բախումները...
          </p>
        )}
        {!isChecking && conflicts.length > 0 && (
          <ConflictList conflicts={conflicts} current={{ cohortId: cohort.id, streamId: key.streamId }} />
        )}
      </form>
    </Modal>
  )
}
