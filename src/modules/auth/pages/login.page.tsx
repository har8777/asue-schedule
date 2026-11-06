import { GraduationCap, LogIn } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { APP_ROUTES } from '../../../app/app.routes'
import { Button } from '../../common/components/button.component'
import { FormField, TextInput } from '../../common/components/form-controls.component'
import { useDocumentTitle } from '../../common/hooks/use-document-title'
import { getErrorMessage } from '../../common/http/http-error'
import { useAuth } from '../auth.context'
import type { LoginPayload } from '../auth.types'

export const LoginPage = () => {
  useDocumentTitle('Մուտք')
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [serverError, setServerError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginPayload>({ defaultValues: { username: '', password: '' } })

  const onSubmit = async (values: LoginPayload) => {
    setServerError(null)
    try {
      await login({ username: values.username.trim(), password: values.password })
      const from = (location.state as { from?: string } | null)?.from
      navigate(from ?? APP_ROUTES.admin.dashboard, { replace: true })
    } catch (error) {
      setServerError(getErrorMessage(error))
    }
  }

  return (
    <div className="flex flex-1 items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-brand-600 text-white shadow-lg shadow-brand-600/30">
            <GraduationCap className="size-8" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Ադմինիստրատիվ մուտք</h1>
            <p className="mt-1 text-sm text-slate-500">Դասացուցակը խմբագրելու համար</p>
          </div>
        </div>

        <form
          onSubmit={handleSubmit(onSubmit)}
          noValidate
          className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900"
        >
          <FormField label="Մուտքանուն" htmlFor="username" error={errors.username?.message}>
            <TextInput
              id="username"
              autoComplete="username"
              autoCapitalize="none"
              placeholder="օր.՝ finans"
              hasError={Boolean(errors.username)}
              {...register('username', { required: 'Մուտքագրեք մուտքանունը' })}
            />
          </FormField>
          <FormField label="Գաղտնաբառ" htmlFor="password" error={errors.password?.message}>
            <TextInput
              id="password"
              type="password"
              autoComplete="current-password"
              hasError={Boolean(errors.password)}
              {...register('password', { required: 'Մուտքագրեք գաղտնաբառը' })}
            />
          </FormField>

          {serverError && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-200" role="alert">
              {serverError}
            </p>
          )}

          <Button type="submit" size="lg" isLoading={isSubmitting} icon={<LogIn className="size-4" />} className="justify-center">
            Մուտք գործել
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500">
          Ուսանողներին մուտք գործել պետք չէ։{' '}
          <Link to={APP_ROUTES.home} className="font-semibold text-brand-600 hover:underline">
            Դիտել դասացուցակը
          </Link>
        </p>
      </div>
    </div>
  )
}
