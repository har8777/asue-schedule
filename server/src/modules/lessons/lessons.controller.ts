import { Router } from '../../core/http/router.ts'
import { asRecord } from '../../core/validation/validators.ts'
import { requireUser, type AuthGuards } from '../auth/auth.guards.ts'
import type { LessonsService } from './lessons.service.ts'
import { parseLessonKey, parseSaveLessonInput } from './lessons.validation.ts'

export const createLessonsController = (lessonsService: LessonsService, guards: AuthGuards): Router =>
  new Router('/cohorts/:cohortId')
    .get('/schedule', (ctx) => lessonsService.getSchedule(ctx.params.cohortId))
    .get('/occupancy', guards.authenticate, (ctx) => {
      const { cohort } = lessonsService.getCohortContext(ctx.params.cohortId)
      return lessonsService.getOccupancy(
        parseLessonKey(cohort, { day: ctx.query.get('day'), slot: ctx.query.get('slot'), streamId: ctx.query.get('streamId') }),
      )
    })
    .post('/lessons/check', guards.authenticate, (ctx) => {
      const { cohort } = lessonsService.getCohortContext(ctx.params.cohortId)
      return lessonsService.checkConflicts(parseSaveLessonInput(cohort, ctx.body))
    })
    .put('/lessons', guards.authenticate, (ctx) => {
      const { cohort } = lessonsService.getCohortContext(ctx.params.cohortId)
      return lessonsService.save(requireUser(ctx), parseSaveLessonInput(cohort, ctx.body))
    })
    .post('/lessons/delete', guards.authenticate, (ctx) => {
      const { cohort } = lessonsService.getCohortContext(ctx.params.cohortId)
      const body = asRecord(ctx.body)
      lessonsService.remove(requireUser(ctx), parseLessonKey(cohort, { day: body.day, slot: body.slot, streamId: body.streamId }))
    })
    .delete('/lessons', guards.authenticate, (ctx) => lessonsService.clearCohort(requireUser(ctx), ctx.params.cohortId))
