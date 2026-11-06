import { Router } from '../../core/http/router.ts'
import { asRecord, requireString } from '../../core/validation/validators.ts'
import { requireUser, type AuthGuards } from './auth.guards.ts'
import type { AuthService } from './auth.service.ts'

export const createAuthController = (authService: AuthService, guards: AuthGuards): Router =>
  new Router('/auth')
    .post('/login', (ctx) => {
      const body = asRecord(ctx.body)
      const username = requireString(body.username, 'Մուտքանուն', { max: 60 })
      const password = requireString(body.password, 'Գաղտնաբառ', { max: 200 })
      return authService.login(username, password, ctx.ip)
    })
    .get('/me', guards.authenticate, (ctx) => requireUser(ctx))
    .post('/change-password', guards.authenticate, async (ctx) => {
      const body = asRecord(ctx.body)
      await authService.changePassword(
        requireUser(ctx).id,
        requireString(body.currentPassword, 'Ընթացիկ գաղտնաբառ', { max: 200 }),
        requireString(body.newPassword, 'Նոր գաղտնաբառ', { max: 200 }),
      )
    })
