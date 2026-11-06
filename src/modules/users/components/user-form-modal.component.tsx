import { useEffect } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { AUTH_CONSTANTS, ROLE_LABELS, USER_ROLES, type UserRole } from '../../auth/auth.constants'
import { Button } from '../../common/components/button.component'
import { FormField, SelectInput, TextInput } from '../../common/components/form-controls.component'
import { Modal } from '../../common/components/modal.component'
import { useToast } from '../../common/components/toast.context'
import { getErrorMessage } from '../../common/http/http-error'
import type { Faculty } from '../../faculties/faculties.types'
import { usersRequests } from '../users.requests'
import type { User } from '../users.types'

interface UserForm {
  username: string
  displayName: string
  password: string
  role: UserRole
  facultyId: string
}

interface UserFormModalProps {
  isOpen: boolean
  user: User | null
  faculties: Faculty[]
  onClose: () => void
  onSaved: () => void
}

const toFormValues = (user: User | null): UserForm => ({
  username: user?.username ?? '',
  displayName: user?.displayName ?? '',
  password: '',
  role: user?.role ?? USER_ROLES.ADMIN,
  facultyId: user?.facultyId ?? '',
})

export const UserFormModal = ({ isOpen, user, faculties, onClose, onSaved }: UserFormModalProps) => {
  const toast = useToast()
  const isEdit = user !== null
  const { control, register, handleSubmit, reset, formState } = useForm<UserForm>({ defaultValues: toFormValues(user) })
  const role = useWatch({ control, name: 'role' })

  useEffect(() => {
    if (isOpen) reset(toFormValues(user))
  }, [isOpen, user, reset])

  const onSubmit = async (values: UserForm) => {
    const facultyId = values.role === USER_ROLES.ADMIN ? values.facultyId : null
    try {
      if (user) {
        await usersRequests.update(user.id, {
          displayName: values.displayName.trim(),
          role: values.role,
          facultyId,
          password: values.password || undefined,
        })
      } else {
        await usersRequests.create({
          username: values.username.trim(),
          displayName: values.displayName.trim(),
          password: values.password,
          role: values.role,
          facultyId,
        })
      }
      toast.success(isEdit ? 'Օգտատերը թարմացվեց' : 'Օգտատերը ստեղծվեց')
      onSaved()
      onClose()
    } catch (error) {
      toast.error(getErrorMessage(error))
    }
  }

  const passwordRules = {
    minLength: { value: AUTH_CONSTANTS.MIN_PASSWORD_LENGTH, message: `Առնվազն ${AUTH_CONSTANTS.MIN_PASSWORD_LENGTH} նիշ` },
    ...(isEdit ? {} : { required: 'Մուտքագրեք գաղտնաբառը' }),
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? 'Խմբագրել օգտատիրոջը' : 'Նոր օգտատեր'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Չեղարկել
          </Button>
          <Button type="submit" form="user-form" isLoading={formState.isSubmitting}>
            Պահպանել
          </Button>
        </>
      }
    >
      <form id="user-form" onSubmit={handleSubmit(onSubmit)} className="grid gap-4 sm:grid-cols-2" noValidate>
        <FormField label="Մուտքանուն" error={formState.errors.username?.message} hint="Լատինատառ, թվեր, . _ -">
          <TextInput
            disabled={isEdit}
            autoCapitalize="none"
            {...register('username', {
              required: 'Մուտքագրեք մուտքանունը',
              pattern: { value: /^[a-zA-Z0-9._-]{3,40}$/, message: '3-40 նիշ՝ լատինատառ, թվեր, . _ -' },
            })}
          />
        </FormField>
        <FormField label="Անուն / պաշտոն" error={formState.errors.displayName?.message}>
          <TextInput {...register('displayName', { required: 'Մուտքագրեք անունը', maxLength: { value: 100, message: 'Առավելագույնը 100 նիշ' } })} />
        </FormField>
        <FormField label="Դեր">
          <SelectInput {...register('role')}>
            {Object.values(USER_ROLES).map((value) => (
              <option key={value} value={value}>
                {ROLE_LABELS[value]}
              </option>
            ))}
          </SelectInput>
        </FormField>
        {role === USER_ROLES.ADMIN && (
          <FormField label="Ֆակուլտետ" error={formState.errors.facultyId?.message}>
            <SelectInput {...register('facultyId', { required: 'Ընտրեք ֆակուլտետը' })}>
              <option value="">— Ընտրեք —</option>
              {faculties.map((faculty) => (
                <option key={faculty.id} value={faculty.id}>
                  {faculty.name}
                </option>
              ))}
            </SelectInput>
          </FormField>
        )}
        <FormField
          label={isEdit ? 'Նոր գաղտնաբառ' : 'Գաղտնաբառ'}
          error={formState.errors.password?.message}
          hint={isEdit ? 'Թողեք դատարկ՝ չփոխելու համար' : undefined}
          className="sm:col-span-2"
        >
          <TextInput type="password" autoComplete="new-password" {...register('password', passwordRules)} />
        </FormField>
      </form>
    </Modal>
  )
}
