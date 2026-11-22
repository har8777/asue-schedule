import { CalendarDays, FileCheck2 } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { cn } from '../../common/utils/classnames'

interface ScheduleSectionTabsProps {
  scheduleTo: string
  examsTo: string
  className?: string
}

/**
 * Երկու առանձին պատուհան՝ «Դասացուցակ» և «Քննագրաֆիկ»։ Կուրս մուտք գործելիս
 * օգտատերը ընտրում է, թե որն է դիտում։
 */
export const ScheduleSectionTabs = ({ scheduleTo, examsTo, className }: ScheduleSectionTabsProps) => (
  <nav className={cn('mb-4 flex gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800', className)}>
    {[
      { to: scheduleTo, label: 'Դասացուցակ', icon: CalendarDays },
      { to: examsTo, label: 'Քննագրաֆիկ', icon: FileCheck2 },
    ].map(({ to, label, icon: Icon }) => (
      <NavLink
        key={to}
        to={to}
        end
        className={({ isActive }) =>
          cn(
            'flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-bold transition-colors',
            isActive
              ? 'bg-white text-brand-700 shadow-sm dark:bg-slate-900 dark:text-brand-200'
              : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100',
          )
        }
      >
        <Icon className="size-4" />
        {label}
      </NavLink>
    ))}
  </nav>
)
