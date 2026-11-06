import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { localStore, STORAGE_KEYS } from '../storage/local-storage'

export type Theme = 'light' | 'dark'

interface ThemeContextValue {
  theme: Theme
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

const readInitialTheme = (): Theme => {
  const stored = localStore.get<Theme | null>(STORAGE_KEYS.THEME, null)
  if (stored) return stored
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

/** Գիշերային/ցերեկային ռեժիմ՝ Tailwind-ի `dark:` դասերով (props-ով փոխանցելու փոխարեն)։ */
export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [theme, setTheme] = useState<Theme>(readInitialTheme)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#020617' : '#1e3a8a')
  }, [theme])

  const toggleTheme = useCallback(() => {
    setTheme((current) => {
      const next = current === 'dark' ? 'light' : 'dark'
      localStore.set(STORAGE_KEYS.THEME, next)
      return next
    })
  }, [])

  return <ThemeContext.Provider value={{ theme, toggleTheme }}>{children}</ThemeContext.Provider>
}

export const useTheme = (): ThemeContextValue => {
  const context = useContext(ThemeContext)
  if (!context) throw new Error('useTheme-ը պետք է օգտագործվի ThemeProvider-ի ներսում')
  return context
}
