import { HttpResult } from '../../core/http/request-context.ts'
import { Router } from '../../core/http/router.ts'
import { requireUser, type AuthGuards } from '../auth/auth.guards.ts'
import type { CohortsService } from './cohorts.service.ts'

export const createCohortsController = (cohortsService: CohortsService, guards: AuthGuards): Router =>
  new Router()
    .get('/cohorts/:id', (ctx) => cohortsService.getById(ctx.params.id))
    .post('/faculties/:facultyId/cohorts', guards.authenticate, (ctx) =>
      HttpResult.created(cohortsService.create(requireUser(ctx), ctx.params.facultyId, ctx.body)),
    )
    .patch('/cohorts/:id', guards.authenticate, (ctx) => cohortsService.update(requireUser(ctx), ctx.params.id, ctx.body))
    .delete('/cohorts/:id', guards.authenticate, (ctx) => {
      cohortsService.delete(requireUser(ctx), ctx.params.id)
    })
