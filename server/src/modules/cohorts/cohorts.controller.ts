import { HttpResult } from '../../core/http/request-context.ts'
import { Router } from '../../core/http/router.ts'
import { USER_ROLES } from '../auth/auth.constants.ts'
import { requireUser, type AuthGuards } from '../auth/auth.guards.ts'
import type { CohortsService } from './cohorts.service.ts'

export const createCohortsController = (cohortsService: CohortsService, guards: AuthGuards): Router =>
  new Router()
    .get('/cohorts/:id', guards.identify, (ctx) => cohortsService.getVisible(ctx.params.id, ctx.user))
    .post('/cohorts/:id/publish', guards.authenticate, guards.requireRoles(USER_ROLES.SUPER_ADMIN), (ctx) =>
      cohortsService.setPublished(ctx.params.id, true),
    )
    .post('/cohorts/:id/unpublish', guards.authenticate, guards.requireRoles(USER_ROLES.SUPER_ADMIN), (ctx) =>
      cohortsService.setPublished(ctx.params.id, false),
    )
    .post('/faculties/:facultyId/cohorts', guards.authenticate, (ctx) =>
      HttpResult.created(cohortsService.create(requireUser(ctx), ctx.params.facultyId, ctx.body)),
    )
    .patch('/cohorts/:id', guards.authenticate, (ctx) => cohortsService.update(requireUser(ctx), ctx.params.id, ctx.body))
    .delete('/cohorts/:id', guards.authenticate, (ctx) => {
      cohortsService.delete(requireUser(ctx), ctx.params.id)
    })
