import { badRequest } from '../../core/http/http-error.ts'
import { Router } from '../../core/http/router.ts'
import { requireOneOf } from '../../core/validation/validators.ts'
import type { AuthGuards } from '../auth/auth.guards.ts'
import { DAY_KEYS, SLOT_KEYS } from '../schedule-config/schedule-config.constants.ts'
import type { ReportsService } from './reports.service.ts'

export const createReportsController = (reportsService: ReportsService, guards: AuthGuards): Router =>
  new Router('/reports')
    .get('/lecturer-schedule', (ctx) => {
      const name = ctx.query.get('name')?.trim()
      if (!name) throw badRequest('Նշեք դասախոսի անունը')
      return reportsService.lecturerSchedule(name)
    })
    .get('/free-rooms', guards.authenticate, (ctx) => {
      const facultyId = ctx.query.get('facultyId')
      if (!facultyId) throw badRequest('Նշեք ֆակուլտետը')
      const slot = ctx.query.get('slot')
      return reportsService.freeRooms(
        facultyId,
        requireOneOf(ctx.query.get('day'), DAY_KEYS, 'Օր'),
        slot && slot !== 'all' ? requireOneOf(slot, SLOT_KEYS, 'Դասաժամ') : null,
      )
    })
    // Բախումները համալսարանային են, ուստի ադմինը կարող է տեսնել նաև այլ ֆակուլտետների հետ բախումները
    .get('/conflicts', guards.authenticate, (ctx) => reportsService.conflicts(ctx.query.get('facultyId') || undefined))
    .get('/search', guards.authenticate, (ctx) => reportsService.search(ctx.query.get('q') ?? ''))
