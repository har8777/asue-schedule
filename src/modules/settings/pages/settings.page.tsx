import { useEffect } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { Button } from '../../common/components/button.component'
import { FormField, TextInput } from '../../common/components/form-controls.component'
import { ImageUploadField } from '../../common/components/image-upload-field.component'
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
  const { register, control, handleSubmit, reset, formState } = useForm<SettingsForm>()

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
          <h2 className="mb-1 font-bold">Պաշտոնական ձևի մակագրություններ</h2>
          <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">
            Ցուցադրվում են դասացուցակի «Պաշտոնական» տեսքում և արտահանվող ֆայլերում։
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Ուսումնական տարի" hint="Օր.՝ 2026-2027։ Դատարկի դեպքում հաշվվում է կիսամյակի սկզբից">
              <TextInput placeholder="2026-2027" {...register('academicYear', { maxLength: 20 })} />
            </FormField>
            <FormField label="Հաստատման ամսաթիվ" hint="Ինչպես թղթային տարբերակում, օր.՝ «28» օգոստոսի 2026թ.">
              <TextInput {...register('approvalDate', { maxLength: 40 })} />
            </FormField>
            <FormField label="Հաստատողի պաշտոնը">
              <TextInput placeholder="ՊՐՈՌԵԿՏՈՐ" {...register('approverTitle', { maxLength: 60 })} />
            </FormField>
            <FormField label="Հաստատողի անուն/ազգանուն">
              <TextInput {...register('approverName', { maxLength: 80 })} />
            </FormField>
            <FormField label="Ստորագրողի պաշտոնը">
              <TextInput placeholder="Ակադեմիական կազմի սպասարկման բաժնի պետ" {...register('partTimeHeadLabel', { maxLength: 80 })} />
            </FormField>
            <FormField label="Ստորագրողի անուն/ազգանուն" hint="Բոլոր դասացուցակների ստորագրության առաջին տողում">
              <TextInput {...register('partTimeHeadName', { maxLength: 80 })} />
            </FormField>
          </div>
          <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
            Ֆակուլտետի դեկանի անունը և ստորագրությունը վերցվում են «Ֆակուլտետներ» բաժնից։
          </p>
        </Card>

        <Card className="p-5">
          <h2 className="mb-1 font-bold">Ստորագրություններ և կնիք</h2>
          <p className="mb-4 text-xs text-slate-500 dark:text-slate-400">
            Պատկերները դրվում են փաստաթղթում իրենց տեղերում ինքնաբերաբար՝ ստորագրությունը գծի վրա, կնիքը՝ հաստատման
            դաշտի կողքին։ Լավագույնը թափանցիկ ֆոնով PNG է, մինչև 300 ԿԲ։
          </p>

          <div className="grid gap-4 sm:grid-cols-2">
            <Controller
              control={control}
              name="logo"
              render={({ field }) => (
                <ImageUploadField
                  label="ՀՊՏՀ-ի լոգոն"
                  hint="Ձևաթղթի ձախ անկյունում։ Առանց դրա գրվում է «ՀՊՏՀ» տեքստով"
                  value={field.value ?? ''}
                  onChange={field.onChange}
                />
              )}
            />
            <Controller
              control={control}
              name="seal"
              render={({ field }) => (
                <ImageUploadField
                  label="Կնիքը"
                  hint="Դրվում է «ՀԱՍՏԱՏՈՒՄ ԵՄ» դաշտի աջ կողմում"
                  value={field.value ?? ''}
                  onChange={field.onChange}
                />
              )}
            />
            <Controller
              control={control}
              name="approverSignature"
              render={({ field }) => (
                <ImageUploadField
                  label="Հաստատողի ստորագրությունը"
                  hint="Պրոռեկտորի ստորագրությունը՝ «ՀԱՍՏԱՏՈՒՄ ԵՄ» դաշտում"
                  value={field.value ?? ''}
                  onChange={field.onChange}
                />
              )}
            />
            <Controller
              control={control}
              name="partTimeHeadSignature"
              render={({ field }) => (
                <ImageUploadField
                  label="Ստորագրողի ստորագրությունը"
                  hint="Բոլոր դասացուցակների ներքևում՝ առաջին տողում"
                  value={field.value ?? ''}
                  onChange={field.onChange}
                />
              )}
            />
          </div>

          <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-xl bg-amber-50 p-3 text-xs dark:bg-amber-950/40">
            <input type="checkbox" className="mt-0.5 size-4 shrink-0 accent-brand-600" {...register('showSignatures')} />
            <span className="text-amber-900 dark:text-amber-200">
              <b>Ցուցադրել ստորագրություններն ու կնիքը փաստաթղթում</b>
              <br />
              Անջատված վիճակում պատկերները պահվում են, բայց ոչ մի տեղ չեն երևում — որպեսզի դեռ չհաստատված դասացուցակը
              պատահաբար կնիքով դուրս չգա։ Միացնելուց հետո դրանք կերևան նաև <b>հանրային էջում</b> և ներբեռնվող ֆայլերում։
            </span>
          </label>
        </Card>

        <Card className="p-5">
          <h2 className="mb-1 font-bold">Դասաժամերի ժամեր</h2>
          <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">
            Դասացուցակում ցուցադրվում է միայն դասաժամի համարը (1-2, 3-4 …)՝ ինչպես պաշտոնական ձևում։ Այս ժամերը
            օգտագործվում են միայն օրացույցի (.ics) ֆայլերում։
          </p>
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
