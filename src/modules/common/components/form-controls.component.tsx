import { forwardRef, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes } from 'react'
import { cn } from '../utils/classnames'

export const inputClassName = cn(
  'h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm transition-colors',
  'placeholder:text-slate-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 focus:outline-none',
  'disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400',
  'dark:border-slate-700 dark:bg-slate-900 dark:disabled:bg-slate-800/50',
)

interface FormFieldProps {
  label: ReactNode
  error?: string
  hint?: ReactNode
  htmlFor?: string
  children: ReactNode
  className?: string
}

export const FormField = ({ label, error, hint, htmlFor, children, className }: FormFieldProps) => (
  <div className={cn('flex flex-col gap-1.5', className)}>
    <label htmlFor={htmlFor} className="text-xs font-semibold text-slate-600 dark:text-slate-300">
      {label}
    </label>
    {children}
    {error ? (
      <p className="text-xs font-medium text-red-600" role="alert">
        {error}
      </p>
    ) : (
      hint && <p className="text-xs text-slate-400">{hint}</p>
    )}
  </div>
)

export const TextInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & { hasError?: boolean }>(
  ({ className, hasError, ...props }, ref) => (
    <input ref={ref} className={cn(inputClassName, hasError && 'border-red-400', className)} {...props} />
  ),
)
TextInput.displayName = 'TextInput'

export const SelectInput = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...props }, ref) => (
    <select ref={ref} className={cn(inputClassName, 'cursor-pointer pr-8', className)} {...props}>
      {children}
    </select>
  ),
)
SelectInput.displayName = 'SelectInput'

interface SegmentedOption<T extends string> {
  value: T
  label: ReactNode
}

interface SegmentedControlProps<T extends string> {
  value: T
  options: SegmentedOption<T>[]
  onChange: (value: T) => void
  className?: string
}

/** Մի քանի տարբերակից մեկի ընտրություն (tab-երի տեսքով)։ */
export const SegmentedControl = <T extends string>({ value, options, onChange, className }: SegmentedControlProps<T>) => (
  <div className={cn('inline-flex rounded-lg bg-slate-100 p-1 dark:bg-slate-800', className)} role="tablist">
    {options.map((option) => (
      <button
        key={option.value}
        type="button"
        role="tab"
        aria-selected={value === option.value}
        onClick={() => onChange(option.value)}
        className={cn(
          'flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-colors',
          value === option.value
            ? 'bg-white text-brand-700 shadow-sm dark:bg-slate-700 dark:text-white'
            : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200',
        )}
      >
        {option.label}
      </button>
    ))}
  </div>
)
