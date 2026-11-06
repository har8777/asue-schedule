import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/** Միավորում է Tailwind դասերը՝ վերացնելով հակասությունները։ */
export const cn = (...inputs: ClassValue[]): string => twMerge(clsx(inputs))
