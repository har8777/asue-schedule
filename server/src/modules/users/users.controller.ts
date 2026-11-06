import { badRequest } from '../../core/http/http-error.ts'
import { HttpResult } from '../../core/http/request-context.ts'
import { Router } from '../../core/http/router.ts'
import {
  asRecord,
  optionalBoolean,
  optionalString,
  requireOneOf,
  requireString,
} from '../../core/validation/validators.ts'
import { USER_ROLE_VALUES, USER_ROLES } from '../auth/auth.constants.ts'
import { requireUser, type AuthGuards } from '../auth/auth.guards.ts'
import type { UsersService } from './users.service.ts'

const USERNAME_PATTERN = /^[a-zA-Z0-9._-]{3,40}$/

const readUsername = (value: unknown): string => {
  const username = requireString(value, 'Մուտքանուն', { min: 3, max: 40 })
  if (!USERNAME_PATTERN.test(username)) {
    throw badRequest('Մուտքանունը կարող է պարունակել միայն լատինատառեր, թվեր և . _ - նշաններ')
  }
  return username
}

const readFacultyId = (value: unknown): string | null | undefined => {
  if (value === undefined) return undefined
  if (value === null || value === '') return null
  return requireString(value, 'Ֆակուլտետ', { max: 100 })
}

/** Օգտատերերի կառավարում՝ միայն գլխավոր ադմինիստրատորի համար։ */
export const createUsersController = (usersService: UsersService, guards: AuthGuards): Router => {
  const onlySuperAdmin = [guards.authenticate, guards.requireRoles(USER_ROLES.SUPER_ADMIN)]

  return new Router('/users')
    .get('/', ...onlySuperAdmin, () => usersService.list())
    .post('/', ...onlySuperAdmin, async (ctx) => {
      const body = asRecord(ctx.body)
      const user = await usersService.create({
        username: readUsername(body.username),
        displayName: requireString(body.displayName, 'Անուն', { max: 100 }),
        password: requireString(body.password, 'Գաղտնաբառ', { max: 200 }),
        role: requireOneOf(body.role, USER_ROLE_VALUES, 'Դեր'),
        facultyId: readFacultyId(body.facultyId) ?? null,
      })
      return HttpResult.created(user)
    })
    .patch('/:id', ...onlySuperAdmin, (ctx) => {
      const body = asRecord(ctx.body)
      return usersService.update(
        ctx.params.id,
        {
          displayName: optionalString(body.displayName, 'Անուն', 100),
          password: optionalString(body.password, 'Գաղտնաբառ') || undefined,
          role: body.role === undefined ? undefined : requireOneOf(body.role, USER_ROLE_VALUES, 'Դեր'),
          facultyId: readFacultyId(body.facultyId),
          isActive: optionalBoolean(body.isActive, 'Ակտիվ'),
        },
        requireUser(ctx).id,
      )
    })
    .delete('/:id', ...onlySuperAdmin, (ctx) => {
      usersService.remove(ctx.params.id, requireUser(ctx).id)
    })
}
