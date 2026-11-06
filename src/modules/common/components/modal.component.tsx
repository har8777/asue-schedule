import { X } from 'lucide-react'
import { useEffect, useId, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '../utils/classnames'

type ModalSize = 'sm' | 'md' | 'lg' | 'xl'

const SIZE_CLASSES: Record<ModalSize, string> = {
  sm: 'sm:max-w-sm',
  md: 'sm:max-w-lg',
  lg: 'sm:max-w-2xl',
  xl: 'sm:max-w-4xl',
}

export interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title: ReactNode
  description?: ReactNode
  size?: ModalSize
  footer?: ReactNode
  children: ReactNode
}

/**
 * Պատուհան, որը հեռախոսում բացվում է ներքևից (bottom sheet), իսկ համակարգչում՝ կենտրոնում։
 * Փակվում է Escape-ով կամ ֆոնին սեղմելով։
 */
export const Modal = ({ isOpen, onClose, title, description, size = 'md', footer, children }: ModalProps) => {
  const titleId = useId()
  const panelRef = useRef<HTMLDivElement>(null)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => {
    if (!isOpen) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const previouslyFocused = document.activeElement as HTMLElement | null
    const focusable = panelRef.current?.querySelector<HTMLElement>('input, select, textarea, button:not([data-close])')
    focusable?.focus()

    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCloseRef.current()
    }
    window.addEventListener('keydown', handleKey)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', handleKey)
      previouslyFocused?.focus?.()
    }
  }, [isOpen])

  if (!isOpen) return null

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-[2px]" onClick={onClose} aria-hidden />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={cn(
          'animate-sheet-in relative flex max-h-[92dvh] w-full flex-col rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl',
          'dark:bg-slate-900 dark:ring-1 dark:ring-slate-800',
          SIZE_CLASSES[size],
        )}
      >
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4 dark:border-slate-800">
          <div className="min-w-0">
            <h2 id={titleId} className="text-base font-bold">
              {title}
            </h2>
            {description && <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{description}</p>}
          </div>
          <button
            type="button"
            data-close
            onClick={onClose}
            className="-mr-1 cursor-pointer rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800"
            aria-label="Փակել"
          >
            <X className="size-5" />
          </button>
        </div>
        <div className="scrollbar-thin flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && (
          <div className="safe-bottom flex flex-wrap items-center justify-end gap-2 border-t border-slate-100 px-5 py-3 dark:border-slate-800">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  )
}
