import { LoaderCircle, RefreshCw, TriangleAlert } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '../utils/classnames'
import { Button } from './button.component'

export const Spinner = ({ className }: { className?: string }) => (
  <LoaderCircle className={cn('size-6 animate-spin text-brand-600', className)} aria-label="Բեռնվում է" />
)

export const PageLoader = ({ label = 'Բեռնվում է...' }: { label?: string }) => (
  <div className="flex flex-1 flex-col items-center justify-center gap-3 py-20 text-sm text-slate-500">
    <Spinner className="size-8" />
    {label}
  </div>
)

export const ErrorState = ({ message, onRetry }: { message: string; onRetry?: () => void }) => (
  <div className="mx-auto flex max-w-md flex-col items-center gap-3 rounded-2xl border border-red-100 bg-red-50 px-6 py-8 text-center dark:border-red-900/50 dark:bg-red-950/30">
    <TriangleAlert className="size-8 text-red-500" />
    <p className="text-sm text-red-800 dark:text-red-200">{message}</p>
    {onRetry && (
      <Button variant="secondary" size="sm" icon={<RefreshCw className="size-4" />} onClick={onRetry}>
        Կրկին փորձել
      </Button>
    )}
  </div>
)

export const EmptyState = ({ icon, title, description, action }: {
  icon?: ReactNode
  title: string
  description?: ReactNode
  action?: ReactNode
}) => (
  <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-slate-200 px-6 py-10 text-center dark:border-slate-700">
    {icon && <div className="mb-1 text-slate-300 dark:text-slate-600">{icon}</div>}
    <p className="font-semibold">{title}</p>
    {description && <p className="max-w-sm text-sm text-slate-500 dark:text-slate-400">{description}</p>}
    {action && <div className="mt-2">{action}</div>}
  </div>
)
