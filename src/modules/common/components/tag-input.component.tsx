import { X } from 'lucide-react'
import { useId, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '../utils/classnames'

/** Ընտրության տարբերակ։ Եթե disabledReason կա, տարբերակը ցուցադրվում է ոչ ակտիվ՝ պատճառով։ */
export interface TagOption {
  value: string
  disabledReason?: string
}

interface TagInputProps {
  value: string[]
  onChange: (value: string[]) => void
  options: TagOption[]
  placeholder?: string
  disabled?: boolean
  maxTags?: number
  id?: string
  /** Եթե նշված է, ցուցակում չեղած արժեքները նշվում են այս պիտակով (օր.՝ «ժամանակավոր»)։ */
  unknownLabel?: string
}

const MAX_VISIBLE_OPTIONS = 60
const DROPDOWN_MAX_HEIGHT = 240
const DROPDOWN_GAP = 4

/**
 * Ցուցակի դիրքը էկրանի նկատմամբ (fixed)։ Ցուցակը ցուցադրվում է portal-ով՝ պատուհանի
 * վրայով, որ չկտրվի scroll-ով բլոկում և չտեղաշարժի մյուս տարրերը։
 * Եթե ներքևում տեղ չկա, բացվում է դաշտից վերև։
 */
const useDropdownPosition = (anchor: HTMLElement | null, isOpen: boolean): CSSProperties | null => {
  const [style, setStyle] = useState<CSSProperties | null>(null)

  useLayoutEffect(() => {
    if (!isOpen || !anchor) return
    const update = () => {
      const rect = anchor.getBoundingClientRect()
      const spaceBelow = window.innerHeight - rect.bottom
      const opensUp = spaceBelow < DROPDOWN_MAX_HEIGHT && rect.top > spaceBelow
      setStyle({
        position: 'fixed',
        left: rect.left,
        width: rect.width,
        maxHeight: Math.min(DROPDOWN_MAX_HEIGHT, (opensUp ? rect.top : spaceBelow) - DROPDOWN_GAP * 2),
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
const normalize = (text: string) => text.trim().replace(/\s+/g, ' ').toLocaleLowerCase('hy')

/**
 * Մի քանի արժեքի ընտրություն (օր.՝ երկու դասախոս)։ Ցուցակում զբաղված տարբերակները
 * ոչ ակտիվ են և ցույց են տալիս, թե որտեղ են զբաղված։ Enter կամ ստորակետ՝ ավելացնելու համար։
 */
export const TagInput = ({ value, onChange, options, placeholder, disabled, maxTags = 10, id, unknownLabel }: TagInputProps) => {
  const [draft, setDraft] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [highlighted, setHighlighted] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [anchor, setAnchor] = useState<HTMLDivElement | null>(null)
  const listId = useId()

  const optionByKey = useMemo(() => new Map(options.map((option) => [normalize(option.value), option])), [options])
  const selectedKeys = useMemo(() => new Set(value.map(normalize)), [value])

  const visibleOptions = useMemo(() => {
    const needle = normalize(draft)
    return options
      .filter((option) => !selectedKeys.has(normalize(option.value)) && (!needle || normalize(option.value).includes(needle)))
      .sort((a, b) => Number(Boolean(a.disabledReason)) - Number(Boolean(b.disabledReason)))
      .slice(0, MAX_VISIBLE_OPTIONS)
  }, [options, draft, selectedKeys])
  const enabledOptions = visibleOptions.filter((option) => !option.disabledReason)
  const dropdownStyle = useDropdownPosition(anchor, isOpen && !disabled && visibleOptions.length > 0)

  const addTag = (raw: string) => {
    const tag = raw.trim().replace(/,$/, '').trim()
    if (!tag || value.length >= maxTags) return
    const known = optionByKey.get(normalize(tag))
    if (known?.disabledReason) {
      setError(`«${known.value}»՝ ${known.disabledReason}`)
      return
    }
    if (!selectedKeys.has(normalize(tag))) onChange([...value, known?.value ?? tag])
    setDraft('')
    setError(null)
    setHighlighted(0)
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      setIsOpen(true)
      const delta = event.key === 'ArrowDown' ? 1 : -1
      setHighlighted((current) => (enabledOptions.length ? (current + delta + enabledOptions.length) % enabledOptions.length : 0))
    } else if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault()
      const option = isOpen && draft ? enabledOptions[highlighted] : undefined
      addTag(option?.value ?? draft)
    } else if (event.key === 'Escape' && isOpen) {
      // Փակում է միայն ցուցակը, ոչ թե ամբողջ պատուհանը
      event.stopPropagation()
      setIsOpen(false)
    } else if (event.key === 'Backspace' && !draft && value.length > 0) {
      onChange(value.slice(0, -1))
    }
  }

  return (
    <div>
      <div
        ref={setAnchor}
        onClick={() => inputRef.current?.focus()}
        className={cn(
          'flex min-h-10 w-full cursor-text flex-wrap items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2 py-1.5',
          'focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-500/20',
          'dark:border-slate-700 dark:bg-slate-900',
          disabled && 'cursor-not-allowed bg-slate-50 opacity-60 dark:bg-slate-800/50',
        )}
      >
        {value.map((tag) => {
          const known = optionByKey.get(normalize(tag))
          const isBusy = Boolean(known?.disabledReason)
          const isUnknown = !known && Boolean(unknownLabel)
          return (
            <span
              key={tag}
              title={isBusy ? known?.disabledReason : isUnknown ? unknownLabel : undefined}
              className={cn(
                'inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold',
                isBusy
                  ? 'bg-red-50 text-red-700 ring-1 ring-red-300 dark:bg-red-950/40 dark:text-red-200 dark:ring-red-800'
                  : isUnknown
                    ? 'bg-amber-50 text-amber-800 ring-1 ring-amber-300 dark:bg-amber-950/40 dark:text-amber-200 dark:ring-amber-800'
                    : 'bg-brand-50 text-brand-700 dark:bg-brand-900/40 dark:text-brand-100',
              )}
            >
              {tag}
              {isBusy && <span className="text-[10px] font-medium">(զբաղված)</span>}
              {isUnknown && <span className="text-[10px] font-medium opacity-80">({unknownLabel})</span>}
              {!disabled && (
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation()
                    onChange(value.filter((item) => item !== tag))
                  }}
                  className="cursor-pointer opacity-70 hover:text-red-600 hover:opacity-100"
                  aria-label={`Հեռացնել ${tag}`}
                >
                  <X className="size-3" />
                </button>
              )}
            </span>
          )
        })}
        <input
          ref={inputRef}
          id={id}
          value={draft}
          disabled={disabled}
          role="combobox"
          aria-expanded={isOpen}
          aria-controls={listId}
          autoComplete="off"
          placeholder={value.length === 0 ? placeholder : ''}
          onFocus={() => setIsOpen(true)}
          onChange={(event) => {
            const next = event.target.value
            setError(null)
            setIsOpen(true)
            setHighlighted(0)
            if (next.includes(',')) next.split(',').forEach(addTag)
            else setDraft(next)
          }}
          onKeyDown={handleKeyDown}
          onBlur={() => {
            setIsOpen(false)
            if (draft) addTag(draft)
          }}
          className="min-w-24 flex-1 bg-transparent px-1 text-sm outline-none placeholder:text-slate-400 disabled:cursor-not-allowed"
        />
      </div>

      {error && (
        <p className="mt-1 text-xs font-medium text-red-600" role="alert">
          {error}
        </p>
      )}

      {dropdownStyle &&
        createPortal(
        <ul
          id={listId}
          role="listbox"
          style={dropdownStyle}
          className="scrollbar-thin z-[70] overflow-y-auto rounded-xl border border-slate-200 bg-white p-1 shadow-xl dark:border-slate-700 dark:bg-slate-900"
        >
          {visibleOptions.map((option) => {
            const isDisabled = Boolean(option.disabledReason)
            const isHighlighted = !isDisabled && enabledOptions[highlighted]?.value === option.value
            return (
              <li
                key={option.value}
                role="option"
                aria-selected={isHighlighted}
                aria-disabled={isDisabled}
                // mousedown-ը, որ input-ը չկորցնի ֆոկուսը մինչև ընտրությունը
                onMouseDown={(event) => {
                  event.preventDefault()
                  if (!isDisabled) addTag(option.value)
                }}
                className={cn(
                  'flex flex-col rounded-lg px-3 py-1.5 text-sm',
                  isDisabled
                    ? 'cursor-not-allowed text-slate-400 dark:text-slate-500'
                    : 'cursor-pointer hover:bg-brand-50 dark:hover:bg-slate-800',
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
        )}
    </div>
  )
}
