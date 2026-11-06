import { useSyncExternalStore } from 'react'

export const useMediaQuery = (query: string): boolean =>
  useSyncExternalStore(
    (onChange) => {
      const media = window.matchMedia(query)
      media.addEventListener('change', onChange)
      return () => media.removeEventListener('change', onChange)
    },
    () => window.matchMedia(query).matches,
    () => false,
  )

/** Tailwind-ի md breakpoint (768px)։ */
export const useIsDesktop = (): boolean => useMediaQuery('(min-width: 768px)')
