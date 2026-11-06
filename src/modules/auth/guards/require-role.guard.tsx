import { Navigate, Outlet } from 'react-router-dom'
import { APP_ROUTES } from '../../../app/app.routes'
import type { UserRole } from '../auth.constants'
import { useAuth } from '../auth.context'

interface RequireRoleGuardProps {
  roles: UserRole[]
}

/** Դերային guard. օրինակ՝ օգտատերերի կառավարումը բաց է միայն գլխավոր ադմինի համար։ */
export const RequireRoleGuard = ({ roles }: RequireRoleGuardProps) => {
  const { hasRole } = useAuth()
  return hasRole(...roles) ? <Outlet /> : <Navigate to={APP_ROUTES.forbidden} replace />
}
