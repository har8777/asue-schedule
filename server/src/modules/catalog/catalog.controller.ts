import { Router } from '../../core/http/router.ts'
import {
  asRecord,
  optionalString,
  requireArray,
  requireOneOf,
  requireString,
} from '../../core/validation/validators.ts'
import { USER_ROLES } from '../auth/auth.constants.ts'
import { requireUser, type AuthGuards } from '../auth/auth.guards.ts'
import type { LessonsRepository } from '../lessons/lessons.repository.ts'
import type { CatalogService } from './catalog.service.ts'
import { CATALOG_TYPES, type CatalogImportRow } from './catalog.types.ts'

const MAX_IMPORT_ROWS = 5000

export const createCatalogController = (
  catalogService: CatalogService,
  lessons: LessonsRepository,
  guards: AuthGuards,
): Router =>
  new Router()
    .get('/faculties/:facultyId/catalog', (ctx) => catalogService.getForFaculty(ctx.params.facultyId))
    .get('/catalog/lecturers', () => {
      const fromLessons = lessons.findAll().flatMap((lesson) => lesson.parts.flatMap((part) => part.lecturers))
      return catalogService.allLecturerNames(fromLessons)
    })
    .post('/faculties/:facultyId/catalog', guards.authenticate, (ctx) => {
      const body = asRecord(ctx.body)
      return catalogService.add(
        requireUser(ctx),
        ctx.params.facultyId,
        requireOneOf(body.type, CATALOG_TYPES, 'Տեսակ'),
        requireString(body.name, 'Անվանում', { max: 200 }),
        optionalString(body.floor, 'Հարկ', 60) ?? '',
      )
    })
    .delete('/catalog/:itemId', guards.authenticate, (ctx) => {
      catalogService.remove(requireUser(ctx), ctx.params.itemId)
    })
    .post('/catalog/import', guards.authenticate, guards.requireRoles(USER_ROLES.SUPER_ADMIN), (ctx) => {
      const rows = requireArray(asRecord(ctx.body).rows, 'Տողեր', { min: 1, max: MAX_IMPORT_ROWS }).map(
        (raw): CatalogImportRow => {
          const row = asRecord(raw, 'Տողը')
          return {
            facultyName: requireString(row.facultyName, 'Ֆակուլտետ'),
            type: requireOneOf(row.type, CATALOG_TYPES, 'Տեսակ'),
            name: requireString(row.name, 'Անվանում'),
            floor: optionalString(row.floor, 'Հարկ', 60),
          }
        },
      )
      return catalogService.importRows(rows)
    })
