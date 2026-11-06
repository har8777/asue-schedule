import { Router } from '../../core/http/router.ts'
import { USER_ROLES } from '../auth/auth.constants.ts'
import type { AuthGuards } from '../auth/auth.guards.ts'
import type { SettingsService } from './settings.service.ts'

export const createSettingsController = (settingsService: SettingsService, guards: AuthGuards): Router =>
  new Router('/settings')
    .get('/', () => settingsService.getPublic())
    .put('/', guards.authenticate, guards.requireRoles(USER_ROLES.SUPER_ADMIN), (ctx) =>
      settingsService.updatePublic(ctx.body),
    )
