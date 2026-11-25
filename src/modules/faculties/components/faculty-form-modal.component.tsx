import { useEffect, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { Button } from '../../common/components/button.component'
import { ImageUploadField } from '../../common/components/image-upload-field.component'
import { ComboboxInput } from '../../common/components/combobox-input.component'
import { FormField, SegmentedControl, SelectInput, TextInput } from '../../common/components/form-controls.component'
import { Modal } from '../../common/components/modal.component'
import { useToast } from '../../common/components/toast.context'
import { getErrorMessage } from '../../common/http/http-error'
import { facultiesRequests } from '../faculties.requests'
import type { FacultyWithCohorts } from '../faculties.types'

/** Նոր գրառումը կարող է լինել առանձին ֆակուլտետ կամ գոյություն ունեցողին կցված բաժին։ */
type CreateMode = 'faculty' | 'division'
type RoomsMode = 'shared' | 'own'

interface FacultyFormValues {
  name: string
  shortName: string
  building: string
  dean: string
  deanSignature: string
  parentFacultyId: string
  roomsMode: RoomsMode
}

interface FacultyFormModalProps {
  isOpen: boolean
  faculty: FacultyWithCohorts | null
  faculties: FacultyWithCohorts[]
  onClose: () => void
  onSaved: () => void
}

/**
 * Ֆակուլտետի ստեղծում/խմբագրում։ Ստեղծելիս կարելի է ընտրել՝ նոր առանձին
 * ֆակուլտետ, թե գոյություն ունեցողին կցված բաժին (օր.՝ «Հեռակա»)։
 */
export const FacultyFormModal = ({ isOpen, faculty, faculties, onClose, onSaved }: FacultyFormModalProps) => {
  const toast = useToast()
  const [mode, setMode] = useState<CreateMode>('faculty')
  const { register, control, handleSubmit, reset, watch, formState } = useForm<FacultyFormValues>()
  const roomsMode = watch('roomsMode')
  const isEditing = faculty !== null

  // Առաջարկվող դեկաններ՝ արդեն լրացված ֆակուլտետների դեկանների անունները
  const deanSuggestions = [...new Set(faculties.map((item) => item.dean).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b, 'hy'),
  )

  useEffect(() => {
    if (!isOpen) return
    setMode('faculty')
    reset({
      name: faculty?.name ?? '',
      shortName: faculty?.shortName ?? '',
      building: faculty?.building ?? '',
      dean: faculty?.dean ?? '',
      deanSignature: faculty?.deanSignature ?? '',
      parentFacultyId: faculties[0]?.id ?? '',
      roomsMode: 'shared',
    })
  }, [isOpen, faculty, faculties, reset])

  const onSubmit = async (values: FacultyFormValues) => {
    try {
      if (isEditing) {
        await facultiesRequests.update(faculty.id, {
          name: values.name.trim(),
          shortName: values.shortName.trim(),
          building: values.building.trim(),
          dean: values.dean.trim(),
          deanSignature: values.deanSignature,
        })
        toast.success('Ֆակուլտետը թարմացվեց')
      } else if (mode === 'division') {
        await facultiesRequests.createDivision(values.parentFacultyId, {
          name: values.name.trim(),
          building: values.roomsMode === 'own' ? values.building.trim() || values.name.trim() : '',
        })
        toast.success('Բաժինը ստեղծվեց՝ 5 կուրսերով։ Հրապարակելուց հետո կերևա բոլորին։')
      } else {
        await facultiesRequests.create({
          name: values.name.trim(),
          shortName: values.shortName.trim(),
          building: values.building.trim(),
          dean: values.dean.trim(),
          deanSignature: values.deanSignature,
        })
        toast.success('Ֆակուլտետը ստեղծվեց՝ 5 կուրսերով։ Հրապարակելուց հետո կերևա բոլորին։')
      }
      onSaved()
      onClose()
    } catch (error) {
      toast.error(getErrorMessage(error))
    }
  }

  const isDivision = !isEditing && mode === 'division'

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Խմբագրել ֆակուլտետը' : 'Նոր ֆակուլտետ'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Չեղարկել
          </Button>
          <Button type="submit" form="faculty-form" isLoading={formState.isSubmitting}>
            Պահպանել
          </Button>
        </>
      }
    >
      <form id="faculty-form" onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
        {!isEditing && (
          <SegmentedControl<CreateMode>
            value={mode}
            onChange={setMode}
            className="w-full"
            options={[
              { value: 'faculty', label: 'Առանձին ֆակուլտետ' },
              { value: 'division', label: 'Կցել ֆակուլտետի' },
            ]}
          />
        )}

        {isDivision && (
          <FormField label="Որ ֆակուլտետին կցել" hint="Բաժինը կերևա այդ ֆակուլտետի ներսում՝ առանձին խմբով">
            <SelectInput {...register('parentFacultyId', { required: true })}>
              {faculties.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </SelectInput>
          </FormField>
        )}

        <FormField label={isDivision ? 'Բաժնի անվանում' : 'Անվանում'} error={formState.errors.name?.message}>
          <TextInput
            placeholder={isDivision ? 'Օր.՝ Հեռակա' : ''}
            {...register('name', {
              required: 'Մուտքագրեք անվանումը',
              maxLength: { value: 150, message: 'Առավելագույնը 150 նիշ' },
            })}
          />
        </FormField>

        {!isDivision && (
          <>
            <FormField label="Կարճ անվանում" hint="Ցուցադրվում է ցուցակներում, օր.՝ «Ֆինանսներ»">
              <TextInput {...register('shortName', { maxLength: 60 })} />
            </FormField>
            <FormField label="Դեկան" hint="Անուն/ազգանուն։ Ցուցակում երևում են արդեն գրանցված դեկանները։">
              <Controller
                control={control}
                name="dean"
                render={({ field }) => (
                  <ComboboxInput
                    value={field.value ?? ''}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    options={deanSuggestions}
                    placeholder="Ընտրեք ցուցակից կամ գրեք անունը"
                  />
                )}
              />
            </FormField>
            <Controller
              control={control}
              name="deanSignature"
              render={({ field }) => (
                <ImageUploadField
                  label="Դեկանի ստորագրությունը"
                  hint="Դրվում է դասացուցակի ներքևում՝ դեկանի տողի գծի վրա։ Թափանցիկ ֆոնով PNG, մինչև 300 ԿԲ"
                  value={field.value ?? ''}
                  onChange={field.onChange}
                />
              )}
            />
          </>
        )}

        {isDivision ? (
          <FormField label="Լսարանները" hint="Սրանից կախված է՝ ինչպես են ստուգվում խաչվող դասերը">
            <SegmentedControl<RoomsMode>
              value={roomsMode ?? 'shared'}
              onChange={(value) => reset({ ...watch(), roomsMode: value })}
              className="w-full"
              options={[
                { value: 'shared', label: 'Մայր ֆակուլտետի' },
                { value: 'own', label: 'Առանձին' },
              ]}
            />
          </FormField>
        ) : (
          <FormField
            label="Մասնաշենք"
            hint="Լսարանների զբաղվածությունը ստուգվում է նույն մասնաշենքի ներսում։ Դատարկ թողնելու դեպքում ֆակուլտետը կունենա իր առանձին մասնաշենքը։"
          >
            <TextInput {...register('building', { maxLength: 100 })} />
          </FormField>
        )}

        {isDivision && roomsMode === 'own' && (
          <FormField label="Բաժնի մասնաշենք" hint="Դատարկ թողնելու դեպքում կօգտագործվի բաժնի անվանումը">
            <TextInput {...register('building', { maxLength: 100 })} />
          </FormField>
        )}
      </form>
    </Modal>
  )
}
