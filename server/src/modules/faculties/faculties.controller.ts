import { HttpResult } from '../../core/http/request-context.ts'
import { Router } from '../../core/http/router.ts'
import { USER_ROLES } from '../auth/auth.constants.ts'
import { requireUser, type AuthGuards } from '../auth/auth.guards.ts'
import type { FacultiesService } from './faculties.service.ts'

export const createFacultiesController = (facultiesService: FacultiesService, guards: AuthGuards): Router => {
  const onlySuperAdmin = [guards.authenticate, guards.requireRoles(USER_ROLES.SUPER_ADMIN)]

  return new Router()
    .get('/faculties', guards.identify, (ctx) => facultiesService.list(ctx.user))
    .get('/faculties/:id', guards.identify, (ctx) => facultiesService.getById(ctx.params.id, ctx.user))
    .get('/faculties/drafts/count', ...onlySuperAdmin, () => facultiesService.countDrafts())
    .post('/faculties/:id/publish', ...onlySuperAdmin, (ctx) => facultiesService.setPublished(ctx.params.id, true))
    .post('/faculties/:id/unpublish', ...onlySuperAdmin, (ctx) => facultiesService.setPublished(ctx.params.id, false))
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
