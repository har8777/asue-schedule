import { useLayoutEffect, useState, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '../utils/classnames'

/** Ընտրության տարբերակ։ Եթե disabledReason կա, տարբերակը ցուցադրվում է ոչ ակտիվ՝ պատճառով։ */
export interface DropdownOption {
  value: string
  disabledReason?: string
}

const DROPDOWN_MAX_HEIGHT = 240
const DROPDOWN_GAP = 4

/**
 * Ցուցակի դիրքը էկրանի նկատմամբ (fixed)։ Ցուցակը ցուցադրվում է portal-ով՝ պատուհանի
 * վրայով, որ չկտրվի scroll ունեցող բլոկում և չտեղաշարժի մյուս տարրերը։
 * Ցուցակը մնում է մոտակա [data-dropdown-boundary] տարրի (օր.՝ modal-ի բովանդակության)
 * սահմաններում, որ չծածկի «Պահպանել»/«Չեղարկել» կոճակները։ Եթե ներքևում տեղ չկա,
 * բացվում է դաշտից վերև։
 */
export const DROPDOWN_BOUNDARY_ATTRIBUTE = 'data-dropdown-boundary'

export const useDropdownPosition = (anchor: HTMLElement | null, isOpen: boolean): CSSProperties | null => {
  const [style, setStyle] = useState<CSSProperties | null>(null)

  useLayoutEffect(() => {
    if (!isOpen || !anchor) return
    const update = () => {
      const rect = anchor.getBoundingClientRect()
      const boundary = anchor.closest(`[${DROPDOWN_BOUNDARY_ATTRIBUTE}]`)?.getBoundingClientRect()
      const boundaryTop = Math.max(boundary?.top ?? 0, 0)
      const boundaryBottom = Math.min(boundary?.bottom ?? window.innerHeight, window.innerHeight)
      const spaceBelow = boundaryBottom - rect.bottom - DROPDOWN_GAP * 2
      const spaceAbove = rect.top - boundaryTop - DROPDOWN_GAP * 2
      const opensUp = spaceBelow < Math.min(DROPDOWN_MAX_HEIGHT, 160) && spaceAbove > spaceBelow
      setStyle({
        position: 'fixed',
        left: rect.left,
        width: rect.width,
        maxHeight: Math.max(Math.min(DROPDOWN_MAX_HEIGHT, opensUp ? spaceAbove : spaceBelow), 80),
        ...(opensUp ? { bottom: window.innerHeight - rect.top + DROPDOWN_GAP } : { top: rect.bottom + DROPDOWN_GAP }),
      })
    }
    update()
    window.addEventListener('resize', update)
    window.addEventListener('scroll', update, true)
    return () => {
      window.removeEventListener('resize', update)
      window.removeEventListener('scroll', update, true)
    }
  }, [anchor, isOpen])

  return isOpen ? style : null
}

interface DropdownListProps {
  id: string
  style: CSSProperties
  options: DropdownOption[]
  highlightedValue?: string
  onSelect: (value: string) => void
}

/**
 * Տարբերակների ցուցակ։ Սա փոխարինում է բրաուզերի <datalist>-ին, որը չի կարող ցույց տալ
 * ոչ ակտիվ տարբերակներ և որոշ բրաուզերներում «կախվում» է էկրանին պատուհանը փակելուց հետո։
 * Այստեղ ցուցակը React-ի մաս է և անհետանում է դաշտի հետ միասին։
 */
export const DropdownList = ({ id, style, options, highlightedValue, onSelect }: DropdownListProps) =>
  createPortal(
    <ul
      id={id}
      role="listbox"
      style={style}
      className="scrollbar-thin z-[70] overflow-y-auto rounded-xl border border-slate-200 bg-white p-1 shadow-xl dark:border-slate-700 dark:bg-slate-900"
    >
      {options.map((option) => {
        const isDisabled = Boolean(option.disabledReason)
        const isHighlighted = !isDisabled && option.value === highlightedValue
        return (
          <li
            key={option.value}
            role="option"
            aria-selected={isHighlighted}
            aria-disabled={isDisabled}
            // mousedown-ը, որ դաշտը չկորցնի ֆոկուսը մինչև ընտրությունը
            onMouseDown={(event) => {
              event.preventDefault()
              if (!isDisabled) onSelect(option.value)
            }}
            className={cn(
              'flex flex-col rounded-lg px-3 py-1.5 text-sm',
              isDisabled ? 'cursor-not-allowed text-slate-400 dark:text-slate-500' : 'cursor-pointer hover:bg-brand-50 dark:hover:bg-slate-800',
              isHighlighted && 'bg-brand-50 dark:bg-slate-800',
            )}
          >
            <span className={cn(isDisabled && 'line-through')}>{option.value}</span>
            {isDisabled && <span className="text-[11px] leading-tight">{option.disabledReason}</span>}
          </li>
        )
      })}
    </ul>,
    document.body,
  )

/** Ստեղնաշարով տեղաշարժ ակտիվ տարբերակների միջև։ */
export const moveHighlight = (enabled: DropdownOption[], current: number, delta: number): number =>
  enabled.length ? (current + delta + enabled.length) % enabled.length : 0

export const normalizeOptionText = (text: string): string => text.trim().replace(/\s+/g, ' ').toLocaleLowerCase('hy')
