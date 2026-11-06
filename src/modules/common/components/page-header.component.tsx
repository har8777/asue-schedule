import type { ReactNode } from 'react'
import { cn } from '../utils/classnames'

interface PageHeaderProps {
  title: ReactNode
  description?: ReactNode
  actions?: ReactNode
  className?: string
}

export const PageHeader = ({ title, description, actions, className }: PageHeaderProps) => (
  <div className={cn('mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between', className)}>
    <div className="min-w-0">
      <h1 className="text-xl font-bold tracking-tight sm:text-2xl">{title}</h1>
      {description && <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{description}</p>}
    </div>
    {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
  </div>
)

export const Card = ({ className, children }: { className?: string; children: ReactNode }) => (
  <div
    className={cn(
      'rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900',
      className,
    )}
  >
    {children}
  </div>
)

export const Badge = ({ className, children }: { className?: string; children: ReactNode }) => (
  <span
    className={cn(
      'inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300',
      className,
    )}
  >
    {children}
  </span>
)
