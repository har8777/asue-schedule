import { Navigate, Outlet } from 'react-router-dom'
import { APP_ROUTES } from '../../../app/app.routes'
import { PageLoader } from '../../common/components/feedback.component'
import { useAuth } from '../auth.context'

/** Մուտքի էջը փակ է արդեն մուտք գործած օգտատիրոջ համար։ */
export const GuestOnlyGuard = () => {
  const { isAuthenticated, isInitializing } = useAuth()
  if (isInitializing) return <PageLoader />
  return isAuthenticated ? <Navigate to={APP_ROUTES.admin.dashboard} replace /> : <Outlet />
}
