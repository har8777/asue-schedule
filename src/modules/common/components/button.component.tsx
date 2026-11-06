import { LoaderCircle } from 'lucide-react'
import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Link, type LinkProps } from 'react-router-dom'
import { cn } from '../utils/classnames'

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success'
type ButtonSize = 'sm' | 'md' | 'lg' | 'icon'

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: 'bg-brand-600 text-white hover:bg-brand-700 shadow-sm',
  secondary:
    'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700 dark:hover:bg-slate-700',
  ghost: 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800',
  danger: 'bg-red-600 text-white hover:bg-red-700 shadow-sm',
  success: 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm',
}

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-xs gap-1.5',
  md: 'h-10 px-4 text-sm gap-2',
  lg: 'h-12 px-6 text-base gap-2',
  icon: 'h-10 w-10 justify-center',
}

export const buttonClassName = (variant: ButtonVariant = 'primary', size: ButtonSize = 'md', className?: string): string =>
  cn(
    'inline-flex shrink-0 cursor-pointer items-center rounded-lg font-semibold whitespace-nowrap transition-colors',
    'disabled:cursor-not-allowed disabled:opacity-50',
    VARIANT_CLASSES[variant],
    SIZE_CLASSES[size],
    className,
  )

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  isLoading?: boolean
  icon?: ReactNode
}

export const Button = ({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  icon,
  className,
  children,
  disabled,
  type = 'button',
  ...props
}: ButtonProps) => (
  <button
    type={type}
    disabled={disabled || isLoading}
    className={buttonClassName(variant, size, className)}
    {...props}
  >
    {isLoading ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : icon}
    {children}
  </button>
)

interface ButtonLinkProps extends LinkProps {
  variant?: ButtonVariant
  size?: ButtonSize
  icon?: ReactNode
}

/** Հղում՝ կոճակի տեսքով (որպեսզի <button>-ը չդրվի <a>-ի մեջ)։ */
export const ButtonLink = ({ variant = 'primary', size = 'md', icon, className, children, ...props }: ButtonLinkProps) => (
  <Link className={buttonClassName(variant, size, typeof className === 'string' ? className : undefined)} {...props}>
    {icon}
    {children}
  </Link>
)
