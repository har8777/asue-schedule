import { X } from 'lucide-react'
import { useId, useState, type KeyboardEvent } from 'react'
import { cn } from '../utils/classnames'

interface TagInputProps {
  value: string[]
  onChange: (value: string[]) => void
  suggestions: string[]
  placeholder?: string
  disabled?: boolean
  maxTags?: number
  id?: string
  /** Եթե նշված է, առաջարկներում չեղած արժեքները նշվում են այս պիտակով (օր.՝ «ժամանակավոր»)։ */
  unknownLabel?: string
}

/**
 * Մի քանի արժեքի մուտքագրում (օր.՝ երկու դասախոս)։ Enter կամ ստորակետ՝ ավելացնելու համար,
 * առաջարկները գալիս են ֆակուլտետի տեղեկատուից։
 */
export const TagInput = ({ value, onChange, suggestions, placeholder, disabled, maxTags = 10, id, unknownLabel }: TagInputProps) => {
  const [draft, setDraft] = useState('')
  const listId = useId()

  const addTag = (raw: string) => {
    const tag = raw.trim().replace(/,$/, '').trim()
    if (!tag || value.length >= maxTags) return
    if (!value.some((existing) => existing.toLowerCase() === tag.toLowerCase())) onChange([...value, tag])
    setDraft('')
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault()
      addTag(draft)
    } else if (event.key === 'Backspace' && !draft && value.length > 0) {
      onChange(value.slice(0, -1))
    }
  }

  const handleChange = (next: string) => {
    // Առաջարկից ընտրելիս արժեքը ավելանում է անմիջապես
    if (suggestions.includes(next)) {
      addTag(next)
      return
    }
    if (next.includes(',')) {
      next.split(',').forEach(addTag)
      return
    }
    setDraft(next)
  }

  return (
    <div
      className={cn(
        'flex min-h-10 w-full flex-wrap items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2 py-1.5',
        'focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-500/20',
        'dark:border-slate-700 dark:bg-slate-900',
        disabled && 'cursor-not-allowed bg-slate-50 opacity-60 dark:bg-slate-800/50',
      )}
    >
      {value.map((tag) => {
        const isUnknown = Boolean(unknownLabel) && !suggestions.includes(tag)
        return (
        <span
          key={tag}
          title={isUnknown ? unknownLabel : undefined}
          className={cn(
            'inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold',
            isUnknown
              ? 'bg-amber-50 text-amber-800 ring-1 ring-amber-300 dark:bg-amber-950/40 dark:text-amber-200 dark:ring-amber-800'
              : 'bg-brand-50 text-brand-700 dark:bg-brand-900/40 dark:text-brand-100',
          )}
        >
          {tag}
          {isUnknown && <span className="text-[10px] font-medium opacity-80">({unknownLabel})</span>}
          {!disabled && (
            <button
              type="button"
              onClick={() => onChange(value.filter((item) => item !== tag))}
              className="cursor-pointer text-brand-500 hover:text-red-600"
              aria-label={`Հեռացնել ${tag}`}
            >
              <X className="size-3" />
            </button>
          )}
        </span>
        )
      })}
      <input
        id={id}
        list={listId}
        value={draft}
        disabled={disabled}
        placeholder={value.length === 0 ? placeholder : ''}
        onChange={(event) => handleChange(event.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => addTag(draft)}
        className="min-w-24 flex-1 bg-transparent px-1 text-sm outline-none placeholder:text-slate-400 disabled:cursor-not-allowed"
      />
      <datalist id={listId}>
        {suggestions
          .filter((suggestion) => !value.includes(suggestion))
          .map((suggestion) => (
            <option key={suggestion} value={suggestion} />
          ))}
      </datalist>
    </div>
  )
}
