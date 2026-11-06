import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { Button } from '../../common/components/button.component'
import { FormField, TextInput } from '../../common/components/form-controls.component'
import { Card, PageHeader } from '../../common/components/page-header.component'
import { useToast } from '../../common/components/toast.context'
import { useDocumentTitle } from '../../common/hooks/use-document-title'
import { getErrorMessage } from '../../common/http/http-error'
import { SLOT_KEYS } from '../../schedule/schedule.constants'
import { useSettings } from '../settings.context'
import { settingsRequests } from '../settings.requests'
import type { PublicSettings } from '../settings.types'

interface SettingsForm extends Omit<PublicSettings, 'semesterStartDate'> {
  semesterStartDate: string
}

/** Համալսարանի ընդհանուր կարգավորումներ (միայն գլխավոր ադմինիստրատոր)։ */
export const SettingsPage = () => {
  useDocumentTitle('Կարգավորումներ')
  const toast = useToast()
  const { settings, setSettings } = useSettings()
  const { register, handleSubmit, reset, formState } = useForm<SettingsForm>()

  useEffect(() => {
    reset({ ...settings, semesterStartDate: settings.semesterStartDate ?? '' })
  }, [settings, reset])

  const onSubmit = async (values: SettingsForm) => {
    try {
      const updated = await settingsRequests.update({
        ...values,
        weeksCount: Number(values.weeksCount),
        semesterStartDate: values.semesterStartDate || null,
      })
      setSettings(updated)
      toast.success('Կարգավորումները պահպանվեցին')
    } catch (error) {
      toast.error(getErrorMessage(error))
    }
  }

  return (
    <>
      <PageHeader title="Կարգավորումներ" />
      <form onSubmit={handleSubmit(onSubmit)} className="flex max-w-3xl flex-col gap-4" noValidate>
        <Card className="grid gap-4 p-5 sm:grid-cols-2">
          <FormField label="Համալսարանի անվանում" error={formState.errors.universityName?.message}>
            <TextInput {...register('universityName', { required: 'Պարտադիր դաշտ' })} />
          </FormField>
          <FormField label="Կիսամյակ" hint="Ցուցադրվում է դասացուցակի վերնագրում">
            <TextInput {...register('semesterLabel', { required: 'Պարտադիր դաշտ' })} />
          </FormField>
          <FormField label="Կիսամյակի սկիզբ" hint="Օգտագործվում է օրացույցի (.ics) ֆայլերում">
            <TextInput type="date" {...register('semesterStartDate')} />
          </FormField>
          <FormField label="Շաբաթների քանակ" error={formState.errors.weeksCount?.message}>
            <TextInput type="number" min={1} max={30} {...register('weeksCount', { required: 'Պարտադիր դաշտ', min: { value: 1, message: '1-30' }, max: { value: 30, message: '1-30' } })} />
          </FormField>
        </Card>

        <Card className="p-5">
          <h2 className="mb-3 font-bold">Դասաժամերի ժամեր</h2>
          <div className="grid gap-2 sm:grid-cols-2">
            {SLOT_KEYS.map((slot) => (
              <div key={slot} className="flex items-center gap-2">
                <span className="w-14 font-mono text-sm font-bold">{slot}</span>
                <TextInput type="time" aria-label={`${slot} սկիզբ`} {...register(`slotTimes.${slot}.start`, { required: true })} />
                <span className="text-slate-400">–</span>
                <TextInput type="time" aria-label={`${slot} ավարտ`} {...register(`slotTimes.${slot}.end`, { required: true })} />
              </div>
            ))}
          </div>
        </Card>

        <Button type="submit" className="self-start" isLoading={formState.isSubmitting}>
          Պահպանել
        </Button>
      </form>
    </>
  )
}
