import { HttpResult } from '../../core/http/request-context.ts'
import { Router } from '../../core/http/router.ts'
import { USER_ROLES } from '../auth/auth.constants.ts'
import { requireUser, type AuthGuards } from '../auth/auth.guards.ts'
import type { BackupService } from './backup.service.ts'

export const createBackupController = (backupService: BackupService, guards: AuthGuards): Router => {
  const onlySuperAdmin = [guards.authenticate, guards.requireRoles(USER_ROLES.SUPER_ADMIN)]

  return new Router('/backup')
    .get('/', ...onlySuperAdmin, () => {
      const fileName = `asue-schedule-backup-${new Date().toISOString().slice(0, 10)}.json`
      return HttpResult.file(JSON.stringify(backupService.export(), null, 2), fileName, 'application/json; charset=utf-8')
    })
    .post('/restore', ...onlySuperAdmin, (ctx) => backupService.restore(requireUser(ctx), ctx.body))
}
