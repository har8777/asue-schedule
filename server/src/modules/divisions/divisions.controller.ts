import { HttpResult } from '../../core/http/request-context.ts'
import { Router } from '../../core/http/router.ts'
import { USER_ROLES } from '../auth/auth.constants.ts'
import type { AuthGuards } from '../auth/auth.guards.ts'
import type { DivisionsService } from './divisions.service.ts'

export const createDivisionsController = (divisions: DivisionsService, guards: AuthGuards): Router => {
  const onlySuperAdmin = [guards.authenticate, guards.requireRoles(USER_ROLES.SUPER_ADMIN)]

  return new Router()
    .post('/faculties/:facultyId/divisions', ...onlySuperAdmin, (ctx) =>
      HttpResult.created(divisions.create(ctx.params.facultyId, ctx.body)),
    )
    .patch('/divisions/:id', ...onlySuperAdmin, (ctx) => divisions.update(ctx.params.id, ctx.body))
    .post('/divisions/:id/publish', ...onlySuperAdmin, (ctx) => divisions.setPublished(ctx.params.id, true))
    .post('/divisions/:id/unpublish', ...onlySuperAdmin, (ctx) => divisions.setPublished(ctx.params.id, false))
    .delete('/divisions/:id', ...onlySuperAdmin, (ctx) => {
      divisions.delete(ctx.params.id)
    })
}
