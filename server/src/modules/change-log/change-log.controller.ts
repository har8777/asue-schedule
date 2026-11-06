import { Router } from '../../core/http/router.ts'
import { USER_ROLES } from '../auth/auth.constants.ts'
import { isSuperAdmin, requireUser, type AuthGuards } from '../auth/auth.guards.ts'
import type { ChangeLogRepository } from './change-log.repository.ts'

const DEFAULT_LIMIT = 100
const MAX_LIMIT = 500

/** Ադմինը տեսնում է միայն իր ֆակուլտետի փոփոխությունները, գլխավոր ադմինը՝ բոլորը։ */
export const createChangeLogController = (changeLog: ChangeLogRepository, guards: AuthGuards): Router =>
  new Router('/change-log')
    .get('/', guards.authenticate, (ctx) => {
      const user = requireUser(ctx)
      const limit = Math.min(Number(ctx.query.get('limit')) || DEFAULT_LIMIT, MAX_LIMIT)
      if (!isSuperAdmin(user)) {
        return user.facultyId ? changeLog.findRecent(limit, user.facultyId) : []
      }
      return changeLog.findRecent(limit, ctx.query.get('facultyId') || undefined)
    })
    .delete('/', guards.authenticate, guards.requireRoles(USER_ROLES.SUPER_ADMIN), () => {
      changeLog.deleteAll()
    })
