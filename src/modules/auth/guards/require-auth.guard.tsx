import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { APP_ROUTES } from '../../../app/app.routes'
import { PageLoader } from '../../common/components/feedback.component'
import { useAuth } from '../auth.context'

/** Փակ էջերի guard. չմուտք գործած օգտատիրոջն ուղարկում է մուտքի էջ։ */
export const RequireAuthGuard = () => {
  const { isAuthenticated, isInitializing } = useAuth()
  const location = useLocation()

  if (isInitializing) return <PageLoader label="Ստուգվում է սեսիան..." />
  if (!isAuthenticated) {
    return <Navigate to={APP_ROUTES.login} replace state={{ from: `${location.pathname}${location.search}` }} />
  }
  return <Outlet />
}
