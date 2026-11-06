import { useEffect, useRef } from 'react'

export type HotkeyMap = Record<string, (event: KeyboardEvent) => void>

/**
 * Ստեղնաշարի համադրություններ, օր.՝ { 'mod+z': undo, 'mod+shift+z': redo }։
 * «mod»-ը Ctrl-ն է Windows-ում և ⌘-ը macOS-ում։
 */
export const useHotkeys = (hotkeys: HotkeyMap, enabled = true): void => {
  const hotkeysRef = useRef(hotkeys)
  hotkeysRef.current = hotkeys

  useEffect(() => {
    if (!enabled) return
    const handler = (event: KeyboardEvent) => {
      const parts = [
        event.ctrlKey || event.metaKey ? 'mod' : '',
        event.shiftKey ? 'shift' : '',
        event.key.toLowerCase(),
      ].filter(Boolean)
      const action = hotkeysRef.current[parts.join('+')]
      if (action) {
        event.preventDefault()
        action(event)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [enabled])
}
