import { lazy, Suspense, type ComponentType, type ReactNode } from 'react'
import { createBrowserRouter, Navigate } from 'react-router-dom'
import { USER_ROLES } from '../modules/auth/auth.constants'
import { GuestOnlyGuard } from '../modules/auth/guards/guest-only.guard'
import { RequireAuthGuard } from '../modules/auth/guards/require-auth.guard'
import { RequireRoleGuard } from '../modules/auth/guards/require-role.guard'
import { LoginPage } from '../modules/auth/pages/login.page'
import { PageLoader } from '../modules/common/components/feedback.component'
import { AdminLayout } from '../modules/common/layouts/admin-layout.component'
import { PublicLayout } from '../modules/common/layouts/public-layout.component'
import { ForbiddenPage, NotFoundPage } from '../modules/common/pages/status.page'
import { FacultiesPage } from '../modules/faculties/pages/faculties.page'
import { LecturerSchedulePage } from '../modules/reports/pages/lecturer-schedule.page'
import { ScheduleViewPage } from '../modules/schedule/pages/schedule-view.page'

/** Ադմինի էջերը բեռնվում են առանձին (code splitting), որ ուսանողների համար կայքը ավելի թեթև լինի։ */
const lazyPage = <TModule,>(loader: () => Promise<TModule>, pick: (module: TModule) => ComponentType): ReactNode => {
  const Page = lazy(async () => ({ default: pick(await loader()) }))
  return (
    <Suspense fallback={<PageLoader />}>
      <Page />
    </Suspense>
  )
}

export const appRouter = createBrowserRouter(
  [
    {
      element: <PublicLayout />,
      children: [
        { index: true, element: <FacultiesPage /> },
        { path: 'schedule/:cohortId', element: <ScheduleViewPage /> },
        { path: 'lecturers', element: <LecturerSchedulePage /> },
        { path: '403', element: <ForbiddenPage /> },
        {
          element: <GuestOnlyGuard />,
          children: [{ path: 'login', element: <LoginPage /> }],
        },
      ],
    },
    {
      path: 'admin',
      element: <RequireAuthGuard />,
      children: [
        {
          element: <AdminLayout />,
          children: [
            { index: true, element: lazyPage(() => import('../modules/dashboard/pages/dashboard.page'), (m) => m.DashboardPage) },
            {
              path: 'schedule/:cohortId',
              element: lazyPage(() => import('../modules/schedule/pages/schedule-editor.page'), (m) => m.ScheduleEditorPage),
            },
            { path: 'conflicts', element: lazyPage(() => import('../modules/reports/pages/conflicts.page'), (m) => m.ConflictsPage) },
            { path: 'free-rooms', element: lazyPage(() => import('../modules/reports/pages/free-rooms.page'), (m) => m.FreeRoomsPage) },
            { path: 'change-log', element: lazyPage(() => import('../modules/change-log/pages/change-log.page'), (m) => m.ChangeLogPage) },
            { path: 'catalog', element: lazyPage(() => import('../modules/catalog/pages/catalog.page'), (m) => m.CatalogPage) },
            {
              element: <RequireRoleGuard roles={[USER_ROLES.SUPER_ADMIN]} />,
              children: [
                {
                  path: 'faculties',
                  element: lazyPage(() => import('../modules/faculties/pages/faculties-manage.page'), (m) => m.FacultiesManagePage),
                },
                { path: 'users', element: lazyPage(() => import('../modules/users/pages/users.page'), (m) => m.UsersPage) },
                { path: 'backup', element: lazyPage(() => import('../modules/backup/pages/backup.page'), (m) => m.BackupPage) },
                { path: 'settings', element: lazyPage(() => import('../modules/settings/pages/settings.page'), (m) => m.SettingsPage) },
              ],
            },
            { path: '*', element: <Navigate to="/admin" replace /> },
          ],
        },
      ],
    },
    { path: '*', element: <PublicLayout />, children: [{ path: '*', element: <NotFoundPage /> }] },
  ],
  { basename: import.meta.env.BASE_URL.replace(/\/$/, '') || '/' },
)
