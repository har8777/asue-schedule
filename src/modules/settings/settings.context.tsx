import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { DEFAULT_SLOT_TIMES } from '../schedule/schedule.constants'
import { settingsRequests } from './settings.requests'
import type { PublicSettings } from './settings.types'

const DEFAULT_SETTINGS: PublicSettings = {
  universityName: 'ՀՊՏՀ',
  semesterLabel: '',
  semesterStartDate: null,
  weeksCount: 16,
  slotTimes: DEFAULT_SLOT_TIMES,
}

interface SettingsContextValue {
  settings: PublicSettings
  setSettings: (settings: PublicSettings) => void
}

const SettingsContext = createContext<SettingsContextValue | null>(null)

/** Համալսարանի ընդհանուր կարգավորումները (դասաժամերի ժամեր, կիսամյակ)՝ բեռնված մեկ անգամ։ */
export const SettingsProvider = ({ children }: { children: ReactNode }) => {
  const [settings, setSettingsState] = useState<PublicSettings>(DEFAULT_SETTINGS)

  useEffect(() => {
    settingsRequests
      .get()
      .then(setSettingsState)
      .catch(() => undefined)
  }, [])

  const setSettings = useCallback((next: PublicSettings) => setSettingsState(next), [])

  return <SettingsContext.Provider value={{ settings, setSettings }}>{children}</SettingsContext.Provider>
}

export const useSettings = (): SettingsContextValue => {
  const context = useContext(SettingsContext)
  if (!context) throw new Error('useSettings-ը պետք է օգտագործվի SettingsProvider-ի ներսում')
  return context
}
