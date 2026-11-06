import { CircleCheck, Info, TriangleAlert, X } from 'lucide-react'
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '../utils/classnames'

type ToastType = 'success' | 'error' | 'info'

interface Toast {
  id: number
  type: ToastType
  message: string
}

interface ToastApi {
  success: (message: string) => void
  error: (message: string) => void
  info: (message: string) => void
}

const ToastContext = createContext<ToastApi | null>(null)

const ICONS: Record<ToastType, ReactNode> = {
  success: <CircleCheck className="size-5 text-emerald-500" />,
  error: <TriangleAlert className="size-5 text-red-500" />,
  info: <Info className="size-5 text-brand-500" />,
}

const DURATION_MS = 4000
let nextId = 1

/** Կարճ ծանուցումներ՝ alert()-ի փոխարեն։ */
export const ToastProvider = ({ children }: { children: ReactNode }) => {
  const [toasts, setToasts] = useState<Toast[]>([])

  const dismiss = useCallback((id: number) => setToasts((current) => current.filter((toast) => toast.id !== id)), [])

  const show = useCallback(
    (type: ToastType, message: string) => {
      const id = nextId++
      setToasts((current) => [...current.slice(-3), { id, type, message }])
      setTimeout(() => dismiss(id), type === 'error' ? DURATION_MS * 1.5 : DURATION_MS)
    },
    [dismiss],
  )

  const api = useMemo<ToastApi>(
    () => ({
      success: (message) => show('success', message),
      error: (message) => show('error', message),
      info: (message) => show('info', message),
    }),
    [show],
  )

  return (
    <ToastContext.Provider value={api}>
      {children}
      {createPortal(
        <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[60] flex flex-col items-center gap-2 px-4 sm:right-4 sm:left-auto sm:items-end">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              role="status"
              className={cn(
                'animate-sheet-in pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border bg-white px-4 py-3 text-sm shadow-lg',
                'dark:border-slate-700 dark:bg-slate-800',
                toast.type === 'error' && 'border-red-200',
              )}
            >
              {ICONS[toast.type]}
              <p className="flex-1 leading-snug">{toast.message}</p>
              <button
                type="button"
                onClick={() => dismiss(toast.id)}
                className="cursor-pointer text-slate-400 hover:text-slate-700"
                aria-label="Փակել"
              >
                <X className="size-4" />
              </button>
            </div>
          ))}
        </div>,
        document.body,
      )}
    </ToastContext.Provider>
  )
}

export const useToast = (): ToastApi => {
  const context = useContext(ToastContext)
  if (!context) throw new Error('useToast-ը պետք է օգտագործվի ToastProvider-ի ներսում')
  return context
}
