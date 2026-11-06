import { CalendarDays, GraduationCap, LayoutDashboard, LogIn, UserRound } from 'lucide-react'
import { Link, NavLink, Outlet } from 'react-router-dom'
import { APP_ROUTES } from '../../../app/app.routes'
import { useAuth } from '../../auth/auth.context'
import { useSettings } from '../../settings/settings.context'
import { cn } from '../utils/classnames'
import { ThemeToggle } from './theme-toggle.component'

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    'flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition-colors',
    isActive
      ? 'bg-brand-50 text-brand-700 dark:bg-slate-800 dark:text-white'
      : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800',
  )

/** Հանրային էջերի շրջանակ՝ ուսանողների և դասախոսների համար (մուտք պետք չէ)։ */
export const PublicLayout = () => {
  const { isAuthenticated } = useAuth()
  const { settings } = useSettings()

  return (
    <>
      <header className="print-hidden sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur dark:border-slate-800 dark:bg-slate-950/90">
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-2 px-3 sm:px-6">
          <Link to={APP_ROUTES.home} className="mr-auto flex min-w-0 items-center gap-2">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-brand-600 text-white">
              <GraduationCap className="size-5" />
            </span>
            <span className="truncate text-sm font-extrabold tracking-tight sm:text-base">
              {settings.universityName} Դասացուցակ
            </span>
          </Link>

          <nav className="flex items-center gap-1">
            <NavLink to={APP_ROUTES.home} end className={navLinkClass} title="Ֆակուլտետներ">
              <CalendarDays className="size-4" />
              <span className="hidden sm:inline">Ֆակուլտետներ</span>
            </NavLink>
            <NavLink to={APP_ROUTES.lecturers} className={navLinkClass} title="Դասախոսներ">
              <UserRound className="size-4" />
              <span className="hidden sm:inline">Դասախոսներ</span>
            </NavLink>
          </nav>

          <ThemeToggle />
          <Link
            to={isAuthenticated ? APP_ROUTES.admin.dashboard : APP_ROUTES.login}
            className="flex size-10 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900 sm:w-auto sm:gap-2 sm:px-3 sm:text-sm sm:font-semibold dark:hover:bg-slate-800 dark:hover:text-white"
            title={isAuthenticated ? 'Կառավարման վահանակ' : 'Մուտք ադմինիստրացիայի համար'}
          >
            {isAuthenticated ? <LayoutDashboard className="size-5 sm:size-4" /> : <LogIn className="size-5 sm:size-4" />}
            <span className="hidden sm:inline">{isAuthenticated ? 'Վահանակ' : 'Մուտք'}</span>
          </Link>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-3 py-4 sm:px-6 sm:py-6">
        <Outlet />
      </main>

      <footer className="print-hidden border-t border-slate-200 py-4 text-center text-xs text-slate-400 dark:border-slate-800">
        {settings.universityName} • {settings.semesterLabel || 'Ակադեմիական դասացուցակ'}
      </footer>
    </>
  )
}
