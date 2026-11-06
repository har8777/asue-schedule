import { Moon, Sun } from 'lucide-react'
import { useTheme } from '../theme/theme.context'
import { cn } from '../utils/classnames'

export const ThemeToggle = ({ className }: { className?: string }) => {
  const { theme, toggleTheme } = useTheme()
  const isDark = theme === 'dark'
  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={cn(
        'flex size-10 cursor-pointer items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900',
        'dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white',
        className,
      )}
      title={isDark ? 'Ցերեկային ռեժիմ' : 'Գիշերային ռեժիմ'}
      aria-label={isDark ? 'Ցերեկային ռեժիմ' : 'Գիշերային ռեժիմ'}
    >
      {isDark ? <Sun className="size-5" /> : <Moon className="size-5" />}
    </button>
  )
}
