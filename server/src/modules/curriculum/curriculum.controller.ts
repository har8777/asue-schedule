import { Router } from '../../core/http/router.ts'
import { asRecord, requireString } from '../../core/validation/validators.ts'
import { USER_ROLES } from '../auth/auth.constants.ts'
import { requireUser, type AuthGuards } from '../auth/auth.guards.ts'
import type { CurriculumService } from './curriculum.service.ts'

export const createCurriculumController = (curriculum: CurriculumService, guards: AuthGuards): Router => {
  const onlySuperAdmin = [guards.authenticate, guards.requireRoles(USER_ROLES.SUPER_ADMIN)]

  const perCohort =
    new Router('/cohorts/:cohortId')
      // Սևագիրը վերադարձվում է միայն super admin-ին. մնացածը տեսնում են հաստատվածը
      .get('/plan', guards.identify, (ctx) => curriculum.getView(ctx.params.cohortId, ctx.user))
      .patch('/plan', ...onlySuperAdmin, (ctx) => curriculum.updateDraft(requireUser(ctx), ctx.params.cohortId, ctx.body))
      .post('/plan/subjects', ...onlySuperAdmin, (ctx) =>
        curriculum.setSubject(requireUser(ctx), ctx.params.cohortId, ctx.body),
      )
      .post('/plan/subjects/delete', ...onlySuperAdmin, (ctx) =>
        curriculum.removeSubject(
          requireUser(ctx),
          ctx.params.cohortId,
          requireString(asRecord(ctx.body).subject, 'Առարկա', { max: 200 }),
        ),
      )
      .post('/plan/publish', ...onlySuperAdmin, (ctx) => curriculum.publish(requireUser(ctx), ctx.params.cohortId))
      .post('/plan/discard', ...onlySuperAdmin, (ctx) => curriculum.discardDraft(requireUser(ctx), ctx.params.cohortId))

  return (
    new Router()
      .use(perCohort)
      // Excel-ից դասընթացների ներմուծում՝ մեկ կամ մի քանի կուրսի համար միանգամից
      .post('/curriculum/import', ...onlySuperAdmin, (ctx) => curriculum.importSubjects(requireUser(ctx), ctx.body))
  )
}
