import { X } from 'lucide-react'
import { useId, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { cn } from '../utils/classnames'
import {
  DropdownList,
  moveHighlight,
  normalizeOptionText,
  useDropdownPosition,
  type DropdownOption,
} from './dropdown-list.component'

export type TagOption = DropdownOption

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

/**
 * Մի քանի արժեքի ընտրություն (օր.՝ երկու դասախոս)։ Ցուցակում զբաղված տարբերակները
 * ոչ ակտիվ են և ցույց են տալիս, թե որտեղ են զբաղված։ Enter կամ ստորակետ՝ ավելացնելու համար։
 */
export const TagInput = ({ value, onChange, options, placeholder, disabled, maxTags = 10, id, unknownLabel }: TagInputProps) => {
  const [draft, setDraft] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [highlighted, setHighlighted] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [anchor, setAnchor] = useState<HTMLDivElement | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const listId = useId()

  const optionByKey = useMemo(() => new Map(options.map((option) => [normalizeOptionText(option.value), option])), [options])
  const selectedKeys = useMemo(() => new Set(value.map(normalizeOptionText)), [value])

  const visibleOptions = useMemo(() => {
    const needle = normalizeOptionText(draft)
    return options
      .filter((option) => {
        const key = normalizeOptionText(option.value)
        return !selectedKeys.has(key) && (!needle || key.includes(needle))
      })
      .sort((a, b) => Number(Boolean(a.disabledReason)) - Number(Boolean(b.disabledReason)))
      .slice(0, MAX_VISIBLE_OPTIONS)
  }, [options, draft, selectedKeys])
  const enabledOptions = visibleOptions.filter((option) => !option.disabledReason)
  const dropdownStyle = useDropdownPosition(anchor, isOpen && !disabled && visibleOptions.length > 0)

  const addTag = (raw: string) => {
    const tag = raw.trim().replace(/,$/, '').trim()
    if (!tag || value.length >= maxTags) return
    const known = optionByKey.get(normalizeOptionText(tag))
    if (known?.disabledReason) {
      setError(`«${known.value}»՝ ${known.disabledReason}`)
      return
    }
    if (!selectedKeys.has(normalizeOptionText(tag))) onChange([...value, known?.value ?? tag])
    setDraft('')
    setError(null)
    setHighlighted(0)
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      setIsOpen(true)
      setHighlighted((current) => moveHighlight(enabledOptions, current, event.key === 'ArrowDown' ? 1 : -1))
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
          const known = optionByKey.get(normalizeOptionText(tag))
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

      {dropdownStyle && (
        <DropdownList
          id={listId}
          style={dropdownStyle}
          options={visibleOptions}
          highlightedValue={enabledOptions[highlighted]?.value}
          onSelect={addTag}
        />
      )}
    </div>
  )
}
