import { forwardRef, useId, useMemo, useState, type KeyboardEvent } from 'react'
import { cn } from '../utils/classnames'
import { DropdownList, moveHighlight, normalizeOptionText, useDropdownPosition } from './dropdown-list.component'
import { inputClassName } from './form-controls.component'

const MAX_VISIBLE_OPTIONS = 60

interface ComboboxInputProps {
  value: string
  onChange: (value: string) => void
  onBlur?: () => void
  options: string[]
  placeholder?: string
  id?: string
  hasError?: boolean
  className?: string
}

/**
 * Մեկ արժեքով դաշտ՝ առաջարկներով (օր.՝ առարկա)։ Կարելի է ընտրել ցուցակից կամ գրել ազատ։
 */
export const ComboboxInput = forwardRef<HTMLInputElement, ComboboxInputProps>(
  ({ value, onChange, onBlur, options, placeholder, id, hasError, className }, ref) => {
    const [isOpen, setIsOpen] = useState(false)
    const [highlighted, setHighlighted] = useState(0)
    const [anchor, setAnchor] = useState<HTMLInputElement | null>(null)
    const listId = useId()

    const visibleOptions = useMemo(() => {
      const needle = normalizeOptionText(value)
      return options
        .filter((option) => !needle || normalizeOptionText(option).includes(needle))
        .filter((option) => normalizeOptionText(option) !== needle)
        .slice(0, MAX_VISIBLE_OPTIONS)
        .map((option) => ({ value: option }))
    }, [options, value])
    const dropdownStyle = useDropdownPosition(anchor, isOpen && visibleOptions.length > 0)

    const select = (next: string) => {
      onChange(next)
      setIsOpen(false)
      setHighlighted(0)
    }

    const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault()
        setIsOpen(true)
        setHighlighted((current) => moveHighlight(visibleOptions, current, event.key === 'ArrowDown' ? 1 : -1))
      } else if (event.key === 'Enter' && isOpen && visibleOptions[highlighted]) {
        event.preventDefault()
        select(visibleOptions[highlighted].value)
      } else if (event.key === 'Escape' && isOpen) {
        // Փակում է միայն ցուցակը, ոչ թե ամբողջ պատուհանը
        event.stopPropagation()
        setIsOpen(false)
      }
    }

    return (
      <>
        <input
          ref={(node) => {
            setAnchor(node)
            if (typeof ref === 'function') ref(node)
            else if (ref) ref.current = node
          }}
          id={id}
          value={value}
          role="combobox"
          aria-expanded={isOpen}
          aria-controls={listId}
          autoComplete="off"
          placeholder={placeholder}
          onFocus={() => setIsOpen(true)}
          onChange={(event) => {
            onChange(event.target.value)
            setIsOpen(true)
            setHighlighted(0)
          }}
          onKeyDown={handleKeyDown}
          onBlur={() => {
            setIsOpen(false)
            onBlur?.()
          }}
          className={cn(inputClassName, hasError && 'border-red-400', className)}
        />
        {dropdownStyle && (
          <DropdownList
            id={listId}
            style={dropdownStyle}
            options={visibleOptions}
            highlightedValue={visibleOptions[highlighted]?.value}
            onSelect={select}
          />
        )}
      </>
    )
  },
)
ComboboxInput.displayName = 'ComboboxInput'
