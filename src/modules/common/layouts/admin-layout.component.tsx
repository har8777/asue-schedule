import { CalendarDays, GraduationCap, KeyRound, LogOut, Menu, Search, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { APP_ROUTES } from '../../../app/app.routes'
import { ROLE_LABELS } from '../../auth/auth.constants'
import { useAuth } from '../../auth/auth.context'
import { ChangePasswordModal } from '../../auth/components/change-password-modal.component'
import { SearchPalette } from '../../reports/components/search-palette.component'
import { useHotkeys } from '../hooks/use-hotkeys'
import { cn } from '../utils/classnames'
import { ADMIN_NAVIGATION } from './admin-navigation'
import { ThemeToggle } from './theme-toggle.component'

const SidebarContent = ({ onNavigate }: { onNavigate: () => void }) => {
  const { user, hasRole, logout } = useAuth()
  const navigate = useNavigate()
  const [isPasswordOpen, setIsPasswordOpen] = useState(false)

  return (
    <div className="flex h-full flex-col">
      <Link to={APP_ROUTES.admin.dashboard} onClick={onNavigate} className="flex items-center gap-2 px-4 py-4">
        <span className="flex size-9 items-center justify-center rounded-xl bg-brand-600 text-white">
          <GraduationCap className="size-5" />
        </span>
        <span className="font-extrabold tracking-tight">Կառավարում</span>
      </Link>

      <nav className="scrollbar-thin flex-1 overflow-y-auto px-3 pb-4">
        {ADMIN_NAVIGATION.map((section) => {
          const items = section.items.filter((item) => hasRole(...item.roles))
          if (items.length === 0) return null
          return (
            <div key={section.title} className="mt-4 first:mt-0">
              <p className="px-3 pb-1 text-[11px] font-bold tracking-wider text-slate-400 uppercase">{section.title}</p>
              {items.map(({ to, label, icon: Icon, end }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={end}
                  onClick={onNavigate}
                  className={({ isActive }) =>
                    cn(
                      'mb-0.5 flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold transition-colors',
                      isActive
                        ? 'bg-brand-600 text-white shadow-sm'
                        : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800',
                    )
                  }
                >
                  <Icon className="size-4" />
                  {label}
                </NavLink>
              ))}
            </div>
          )
        })}
        <div className="mt-4 border-t border-slate-200 pt-4 dark:border-slate-800">
          <Link
            to={APP_ROUTES.home}
            onClick={onNavigate}
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <CalendarDays className="size-4" />
            Հանրային դասացուցակ
          </Link>
        </div>
      </nav>

      <div className="border-t border-slate-200 p-3 dark:border-slate-800">
        <div className="mb-2 px-1">
          <p className="truncate text-sm font-bold">{user?.displayName}</p>
          <p className="truncate text-xs text-slate-500">{user ? ROLE_LABELS[user.role] : ''}</p>
        </div>
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <button
            type="button"
            onClick={() => setIsPasswordOpen(true)}
            className="flex size-10 cursor-pointer items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
            title="Փոխել գաղտնաբառը"
            aria-label="Փոխել գաղտնաբառը"
          >
            <KeyRound className="size-5" />
          </button>
          <button
            type="button"
            onClick={() => {
              logout()
              navigate(APP_ROUTES.home)
            }}
            className="ml-auto flex h-10 cursor-pointer items-center gap-2 rounded-lg px-3 text-sm font-semibold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40"
          >
            <LogOut className="size-4" />
            Դուրս գալ
          </button>
        </div>
      </div>
      <ChangePasswordModal isOpen={isPasswordOpen} onClose={() => setIsPasswordOpen(false)} />
    </div>
  )
}

/** Ադմինիստրատիվ էջերի շրջանակ. համակարգչում՝ կողային մենյու, հեռախոսում՝ բացվող մենյու։ */
export const AdminLayout = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const location = useLocation()

  useHotkeys({ 'mod+k': () => setIsSearchOpen((open) => !open) })
  useEffect(() => setIsMenuOpen(false), [location.pathname])

  return (
    <div className="flex min-h-screen">
      <aside className="print-hidden sticky top-0 hidden h-screen w-64 shrink-0 border-r border-slate-200 bg-white lg:block dark:border-slate-800 dark:bg-slate-900">
        <SidebarContent onNavigate={() => undefined} />
      </aside>

      {isMenuOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-slate-900/60" onClick={() => setIsMenuOpen(false)} aria-hidden />
          <aside className="animate-sheet-in absolute inset-y-0 left-0 w-72 max-w-[85vw] bg-white shadow-2xl dark:bg-slate-900">
            <button
              type="button"
              onClick={() => setIsMenuOpen(false)}
              className="absolute top-4 right-3 cursor-pointer rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              aria-label="Փակել մենյուն"
            >
              <X className="size-5" />
            </button>
            <SidebarContent onNavigate={() => setIsMenuOpen(false)} />
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="print-hidden sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-slate-200 bg-white/90 px-3 backdrop-blur sm:px-6 dark:border-slate-800 dark:bg-slate-950/90">
          <button
            type="button"
            onClick={() => setIsMenuOpen(true)}
            className="flex size-10 cursor-pointer items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 lg:hidden dark:text-slate-300 dark:hover:bg-slate-800"
            aria-label="Բացել մենյուն"
          >
            <Menu className="size-5" />
          </button>
          <button
            type="button"
            onClick={() => setIsSearchOpen(true)}
            className="flex h-10 w-full max-w-md cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-400 hover:border-brand-300 dark:border-slate-700 dark:bg-slate-900"
          >
            <Search className="size-4" />
            <span className="flex-1 text-left">Որոնել դաս, դասախոս, լսարան...</span>
            <kbd className="hidden rounded border border-slate-200 bg-white px-1.5 font-mono text-[10px] font-bold sm:inline dark:border-slate-700 dark:bg-slate-800">
              Ctrl K
            </kbd>
          </button>
        </header>

        <main className="flex w-full flex-1 flex-col px-3 py-4 sm:px-6 sm:py-6">
          <Outlet />
        </main>
      </div>

      <SearchPalette isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
    </div>
  )
}
