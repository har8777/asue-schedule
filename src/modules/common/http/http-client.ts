import axios, { type AxiosInstance } from 'axios'
import { HTTP_CLIENT_CONSTANTS } from './http-client.constants'

type TokenProvider = () => string | null
type UnauthorizedHandler = () => void

let getToken: TokenProvider = () => null
let onUnauthorized: UnauthorizedHandler = () => {}

/**
 * Միակ axios օրինակը ամբողջ հավելվածի համար։ Մոդուլները կախված են այս
 * աբստրակցիայից, իսկ auth մոդուլը գրանցում է token-ի աղբյուրը (Dependency Inversion)։
 */
export const httpClient: AxiosInstance = axios.create({
  baseURL: HTTP_CLIENT_CONSTANTS.BASE_URL,
  timeout: HTTP_CLIENT_CONSTANTS.TIMEOUT_MS,
  headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
})

httpClient.interceptors.request.use((config) => {
  const token = getToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

httpClient.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    const hadToken = Boolean(getToken())
    if (axios.isAxiosError(error) && error.response?.status === 401 && hadToken) {
      onUnauthorized()
    }
    return Promise.reject(error)
  },
)

export const configureHttpAuth = (tokenProvider: TokenProvider, unauthorizedHandler: UnauthorizedHandler): void => {
  getToken = tokenProvider
  onUnauthorized = unauthorizedHandler
}
