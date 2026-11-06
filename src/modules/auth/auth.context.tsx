import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { configureHttpAuth } from '../common/http/http-client'
import { USER_ROLES, type UserRole } from './auth.constants'
import { authRequests } from './auth.requests'
import { authStorage } from './auth.storage'
import type { AuthSession, AuthUser, LoginPayload } from './auth.types'

interface AuthContextValue {
  user: AuthUser | null
  isAuthenticated: boolean
  /** true, մինչև պահպանված սեսիան ստուգվի սերվերում։ */
  isInitializing: boolean
  isSuperAdmin: boolean
  hasRole: (...roles: UserRole[]) => boolean
  /** Արդյոք օգտատերը կարող է խմբագրել տվյալ ֆակուլտետի դասացուցակը։ */
  canEditFaculty: (facultyId: string | null | undefined) => boolean
  login: (payload: LoginPayload) => Promise<AuthUser>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<AuthSession | null>(() => authStorage.read())
  const [isInitializing, setIsInitializing] = useState(() => authStorage.read() !== null)
  const sessionRef = useRef(session)
  sessionRef.current = session

  const logout = useCallback(() => {
    authStorage.clear()
    sessionRef.current = null
    setSession(null)
  }, [])

  // http-client-ը token-ը ստանում է այստեղից, իսկ 401-ի դեպքում սեսիան փակվում է։
  // Կարգավորվում է համաժամ (render-ի ընթացքում մեկ անգամ), որպեսզի ներդրված
  // կոմպոնենտների առաջին հարցումներն էլ արդեն ունենան token։
  const isHttpConfigured = useRef(false)
  if (!isHttpConfigured.current) {
    configureHttpAuth(() => sessionRef.current?.token ?? null, logout)
    isHttpConfigured.current = true
  }

  // Պահպանված սեսիայի ստուգում և օգտատիրոջ թարմ տվյալների ստացում (օր.՝ եթե դերը փոխվել է)
  useEffect(() => {
    if (!sessionRef.current) return
    authRequests
      .me()
      .then((user) =>
        setSession((current) => {
          if (!current) return current
          const next = { ...current, user }
          authStorage.write(next)
          return next
        }),
      )
      .catch(() => undefined)
      .finally(() => setIsInitializing(false))
  }, [])

  const login = useCallback(async (payload: LoginPayload) => {
    const nextSession = await authRequests.login(payload)
    authStorage.write(nextSession)
    sessionRef.current = nextSession
    setSession(nextSession)
    return nextSession.user
  }, [])

  const value = useMemo<AuthContextValue>(() => {
    const user = session?.user ?? null
    const hasRole = (...roles: UserRole[]) => Boolean(user && roles.includes(user.role))
    return {
      user,
      isAuthenticated: user !== null,
      isInitializing,
      isSuperAdmin: user?.role === USER_ROLES.SUPER_ADMIN,
      hasRole,
      canEditFaculty: (facultyId) =>
        Boolean(user && facultyId && (user.role === USER_ROLES.SUPER_ADMIN || user.facultyId === facultyId)),
      login,
      logout,
    }
  }, [session, isInitializing, login, logout])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth-ը պետք է օգտագործվի AuthProvider-ի ներսում')
  return context
}
