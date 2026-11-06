import { HttpResult } from '../../core/http/request-context.ts'
import { Router } from '../../core/http/router.ts'
import { USER_ROLES } from '../auth/auth.constants.ts'
import { requireUser, type AuthGuards } from '../auth/auth.guards.ts'
import type { FacultiesService } from './faculties.service.ts'

export const createFacultiesController = (facultiesService: FacultiesService, guards: AuthGuards): Router => {
  const onlySuperAdmin = [guards.authenticate, guards.requireRoles(USER_ROLES.SUPER_ADMIN)]

  return new Router()
    .get('/faculties', () => facultiesService.list())
    .get('/faculties/:id', (ctx) => facultiesService.getById(ctx.params.id))
    .post('/faculties', ...onlySuperAdmin, (ctx) => HttpResult.created(facultiesService.create(ctx.body)))
    .patch('/faculties/:id', ...onlySuperAdmin, (ctx) => facultiesService.update(ctx.params.id, ctx.body))
    .delete('/faculties/:id', ...onlySuperAdmin, (ctx) => {
      facultiesService.delete(ctx.params.id)
    })
    .delete('/faculties/:id/lessons', ...onlySuperAdmin, (ctx) =>
      facultiesService.clearLessons(requireUser(ctx), ctx.params.id),
    )
    .delete('/lessons', ...onlySuperAdmin, (ctx) => facultiesService.clearAllLessons(requireUser(ctx)))
}
