import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react'
import { getErrorMessage } from '../http/http-error'

export interface AsyncDataState<T> {
  data: T | null
  error: string | null
  isLoading: boolean
  reload: () => Promise<void>
  setData: Dispatch<SetStateAction<T | null>>
}

/**
 * Բեռնում է տվյալները և հետևում վիճակին։ Կախվածությունների փոփոխության դեպքում
 * կրկին բեռնում է, իսկ հին պատասխանները անտեսվում են (race condition-ի դեմ)։
 */
export const useAsyncData = <T>(loader: () => Promise<T>, deps: readonly unknown[]): AsyncDataState<T> => {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const requestId = useRef(0)
  const loaderRef = useRef(loader)
  loaderRef.current = loader

  const reload = useCallback(async () => {
    const currentRequest = ++requestId.current
    setIsLoading(true)
    setError(null)
    try {
      const result = await loaderRef.current()
      if (currentRequest === requestId.current) setData(result)
    } catch (loadError) {
      if (currentRequest === requestId.current) setError(getErrorMessage(loadError))
    } finally {
      if (currentRequest === requestId.current) setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void reload()
  }, deps)

  return { data, error, isLoading, reload, setData }
}
