import { forbidden, unauthorized } from '../../core/http/http-error.ts'
import type { RequestContext, RouteHandler } from '../../core/http/request-context.ts'
import { USER_ROLES, type UserRole } from './auth.constants.ts'
import type { AuthService } from './auth.service.ts'
import type { AuthUser } from './auth.types.ts'

export interface AuthGuards {
  /** Պահանջում է վավեր token։ */
  authenticate: RouteHandler
  /** Կցում է օգտատիրոջը, եթե token կա, բայց չի պահանջում։ */
  identify: RouteHandler
  /** Թույլ է տալիս միայն նշված դերերին (կանչվում է authenticate-ից հետո)։ */
  requireRoles: (...roles: UserRole[]) => RouteHandler
}

const readBearerToken = (ctx: RequestContext): string | null => {
  const header = ctx.req.headers.authorization
  if (!header?.startsWith('Bearer ')) return null
  return header.slice(7).trim() || null
}

export const createAuthGuards = (authService: AuthService): AuthGuards => ({
  authenticate: (ctx) => {
    const token = readBearerToken(ctx)
    const user = token ? authService.resolveUser(token) : null
    if (!user) throw unauthorized('Սեսիան ավարտվել է։ Խնդրում ենք կրկին մուտք գործել։')
    ctx.user = user
  },
  identify: (ctx) => {
    const token = readBearerToken(ctx)
    ctx.user = token ? authService.resolveUser(token) : null
  },
  requireRoles:
    (...roles) =>
    (ctx) => {
      if (!ctx.user) throw unauthorized()
      if (!roles.includes(ctx.user.role)) throw forbidden()
    },
})

export const requireUser = (ctx: RequestContext): AuthUser => {
  if (!ctx.user) throw unauthorized()
  return ctx.user
}

export const isSuperAdmin = (user: AuthUser | null): boolean => user?.role === USER_ROLES.SUPER_ADMIN

/** Ադմինը կարող է փոփոխել միայն իր ֆակուլտետի տվյալները։ */
export const assertFacultyAccess = (user: AuthUser | null, facultyId: string): void => {
  if (!user) throw unauthorized()
  if (user.role === USER_ROLES.SUPER_ADMIN) return
  if (user.facultyId !== facultyId) {
    throw forbidden('Կարող եք խմբագրել միայն Ձեր ֆակուլտետի դասացուցակը')
  }
}
