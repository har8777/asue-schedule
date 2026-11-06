import { useForm } from 'react-hook-form'
import { Button } from '../../common/components/button.component'
import { FormField, TextInput } from '../../common/components/form-controls.component'
import { Modal } from '../../common/components/modal.component'
import { useToast } from '../../common/components/toast.context'
import { getErrorMessage } from '../../common/http/http-error'
import { AUTH_CONSTANTS } from '../auth.constants'
import { authRequests } from '../auth.requests'

interface ChangePasswordForm {
  currentPassword: string
  newPassword: string
  confirmPassword: string
}

export const ChangePasswordModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  const toast = useToast()
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ChangePasswordForm>()

  const close = () => {
    reset()
    onClose()
  }

  const onSubmit = async ({ currentPassword, newPassword }: ChangePasswordForm) => {
    try {
      await authRequests.changePassword({ currentPassword, newPassword })
      toast.success('Գաղտնաբառը փոխվեց')
      close()
    } catch (error) {
      setError('currentPassword', { message: getErrorMessage(error) })
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={close}
      size="sm"
      title="Փոխել գաղտնաբառը"
      footer={
        <>
          <Button variant="secondary" onClick={close}>
            Չեղարկել
          </Button>
          <Button type="submit" form="change-password-form" isLoading={isSubmitting}>
            Պահպանել
          </Button>
        </>
      }
    >
      <form id="change-password-form" onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
        <FormField label="Ընթացիկ գաղտնաբառ" error={errors.currentPassword?.message}>
          <TextInput
            type="password"
            autoComplete="current-password"
            {...register('currentPassword', { required: 'Պարտադիր դաշտ' })}
          />
        </FormField>
        <FormField label="Նոր գաղտնաբառ" error={errors.newPassword?.message} hint={`Առնվազն ${AUTH_CONSTANTS.MIN_PASSWORD_LENGTH} նիշ`}>
          <TextInput
            type="password"
            autoComplete="new-password"
            {...register('newPassword', {
              required: 'Պարտադիր դաշտ',
              minLength: { value: AUTH_CONSTANTS.MIN_PASSWORD_LENGTH, message: `Առնվազն ${AUTH_CONSTANTS.MIN_PASSWORD_LENGTH} նիշ` },
            })}
          />
        </FormField>
        <FormField label="Կրկնել նոր գաղտնաբառը" error={errors.confirmPassword?.message}>
          <TextInput
            type="password"
            autoComplete="new-password"
            {...register('confirmPassword', {
              validate: (value, values) => value === values.newPassword || 'Գաղտնաբառերը չեն համընկնում',
            })}
          />
        </FormField>
      </form>
    </Modal>
  )
}
