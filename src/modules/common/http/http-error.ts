import axios from 'axios'

export interface ApiErrorBody<TDetails = unknown> {
  code: string
  message: string
  details?: TDetails
}

const NETWORK_ERROR_MESSAGE = 'Սերվերի հետ կապ չկա։ Ստուգեք ինտերնետ կապը և փորձեք կրկին։'

export const getApiError = <TDetails = unknown>(error: unknown): ApiErrorBody<TDetails> | null => {
  if (!axios.isAxiosError(error)) return null
  const data = error.response?.data as Partial<ApiErrorBody<TDetails>> | undefined
  if (!data || typeof data.message !== 'string') return null
  return { code: data.code ?? 'UNKNOWN', message: data.message, details: data.details }
}

/** Օգտատիրոջը ցուցադրվող հայերեն հաղորդագրություն ցանկացած սխալի համար։ */
export const getErrorMessage = (error: unknown, fallback = 'Տեղի ունեցավ սխալ։ Փորձեք կրկին։'): string => {
  const apiError = getApiError(error)
  if (apiError) return apiError.message
  if (axios.isAxiosError(error) && !error.response) return NETWORK_ERROR_MESSAGE
  return fallback
}

export const getErrorStatus = (error: unknown): number | null =>
  axios.isAxiosError(error) ? (error.response?.status ?? null) : null
