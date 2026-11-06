import type { Database } from '../../core/database/database.ts'
import { badRequest } from '../../core/http/http-error.ts'
import { createId, nowIso } from '../../core/utils/id.ts'
import { asRecord, requireArray, requireOneOf, requireString } from '../../core/validation/validators.ts'
import type { AuthUser } from '../auth/auth.types.ts'
import type { CatalogRepository } from '../catalog/catalog.repository.ts'
import type { CatalogService } from '../catalog/catalog.service.ts'
import { CATALOG_TYPES, type CatalogItem } from '../catalog/catalog.types.ts'
import type { ChangeLogRepository } from '../change-log/change-log.repository.ts'
import { createStream } from '../cohorts/cohorts.constants.ts'
import type { CohortsRepository } from '../cohorts/cohorts.repository.ts'
import type { CohortsService } from '../cohorts/cohorts.service.ts'
import type { Cohort } from '../cohorts/cohorts.types.ts'
import type { FacultiesRepository } from '../faculties/faculties.repository.ts'
import type { FacultiesService } from '../faculties/faculties.service.ts'
import type { Faculty } from '../faculties/faculties.types.ts'
import type { LessonsRepository } from '../lessons/lessons.repository.ts'
import type { Lesson } from '../lessons/lessons.types.ts'
import { getCohortDaySlots, parseLessonParts } from '../lessons/lessons.validation.ts'
import {
  DAY_KEYS,
  MAX_STREAMS,
  SLOT_KEYS,
  type DayKey,
  type SlotKey,
} from '../schedule-config/schedule-config.constants.ts'
import type { SettingsService } from '../settings/settings.service.ts'
import type { PublicSettings } from '../settings/settings.types.ts'
import type { UsersRepository } from '../users/users.repository.ts'
import { isLegacyBackup, parseLegacyBackup, type LegacyCell } from './legacy-backup.parser.ts'

export const BACKUP_FORMAT = 'asue-schedule-backup'
export const BACKUP_VERSION = 1

export interface BackupFile {
  format: typeof BACKUP_FORMAT
  version: number
  exportedAt: string
  settings: PublicSettings
  faculties: Faculty[]
  cohorts: Cohort[]
  lessons: Lesson[]
  catalog: CatalogItem[]
}

export interface RestoreResult {
  mode: 'full' | 'legacy'
  faculties: number
  cohorts: number
  lessons: number
}

interface BackupDependencies {
  db: Database
  faculties: FacultiesRepository
  facultiesService: FacultiesService
  cohorts: CohortsRepository
  cohortsService: CohortsService
  lessons: LessonsRepository
  catalog: CatalogRepository
  catalogService: CatalogService
  settings: SettingsService
  users: UsersRepository
  changeLog: ChangeLogRepository
}

/** Ամբողջ դասացուցակի արտահանում/վերականգնում (օգտատերերը չեն ներառվում՝ անվտանգության համար)։ */
export class BackupService {
  private readonly deps: BackupDependencies

  constructor(deps: BackupDependencies) {
    this.deps = deps
  }

  export(): BackupFile {
    const { faculties, cohorts, lessons, catalog, settings } = this.deps
    return {
      format: BACKUP_FORMAT,
      version: BACKUP_VERSION,
      exportedAt: nowIso(),
      settings: settings.getPublic(),
      faculties: faculties.findAll(),
      cohorts: cohorts.findAll(),
      lessons: lessons.findAll(),
      catalog: catalog.findAll(),
    }
  }

  restore(user: AuthUser, data: unknown): RestoreResult {
    if (isLegacyBackup(data)) return this.importLegacy(user, parseLegacyBackup(data))
    const body = asRecord(data, 'Ֆայլը')
    if (body.format !== BACKUP_FORMAT) throw badRequest('Ֆայլը այս համակարգի պահուստային պատճեն չէ')
    return this.restoreFull(user, body)
  }

  private restoreFull(user: AuthUser, body: Record<string, unknown>): RestoreResult {
    const { db, faculties, cohorts, lessons, catalog, cohortsService, settings, users } = this.deps

    const facultyList = requireArray(body.faculties, 'Ֆակուլտետներ').map((raw): Faculty => {
      const item = asRecord(raw, 'Ֆակուլտետը')
      return {
        id: requireString(item.id, 'id', { max: 100 }),
        name: requireString(item.name, 'Անվանում', { max: 150 }),
        shortName: typeof item.shortName === 'string' ? item.shortName : '',
        building: typeof item.building === 'string' ? item.building : '',
        sortOrder: typeof item.sortOrder === 'number' ? item.sortOrder : 0,
        createdAt: typeof item.createdAt === 'string' ? item.createdAt : nowIso(),
      }
    })
    const cohortList = requireArray(body.cohorts, 'Կուրսեր').map((raw): Cohort => {
      const item = asRecord(raw, 'Կուրսը')
      return {
        id: requireString(item.id, 'id', { max: 100 }),
        facultyId: requireString(item.facultyId, 'facultyId', { max: 100 }),
        name: requireString(item.name, 'Անվանում', { max: 80 }),
        kind: requireOneOf(item.kind, ['year', 'program'] as const, 'Տեսակ'),
        sortOrder: typeof item.sortOrder === 'number' ? item.sortOrder : 0,
        settings: cohortsService.parseSettings(item.settings),
      }
    })
    const lessonList = requireArray(body.lessons, 'Դասեր', { max: 100000 }).map((raw): Lesson => {
      const item = asRecord(raw, 'Դասը')
      return {
        id: requireString(item.id, 'id', { max: 100 }),
        cohortId: requireString(item.cohortId, 'cohortId', { max: 100 }),
        day: requireOneOf(item.day, DAY_KEYS, 'Օր'),
        slot: requireOneOf(item.slot, SLOT_KEYS, 'Դասաժամ'),
        streamId: requireString(item.streamId, 'Հոսք', { max: 40 }),
        parts: parseLessonParts(item.parts),
        updatedAt: typeof item.updatedAt === 'string' ? item.updatedAt : nowIso(),
        updatedBy: null,
      }
    })
    const catalogList = requireArray(body.catalog ?? [], 'Տեղեկատու', { max: 100000 }).map((raw): CatalogItem => {
      const item = asRecord(raw, 'Տարրը')
      return {
        id: requireString(item.id, 'id', { max: 100 }),
        facultyId: requireString(item.facultyId, 'facultyId', { max: 100 }),
        type: requireOneOf(item.type, CATALOG_TYPES, 'Տեսակ'),
        name: requireString(item.name, 'Անվանում'),
        floor: typeof item.floor === 'string' ? item.floor : '',
        createdAt: typeof item.createdAt === 'string' ? item.createdAt : nowIso(),
      }
    })

    return db.transaction(() => {
      // Պահպանում ենք ադմինների կապը ֆակուլտետների հետ, որը ջնջման ժամանակ կզրոյանա
      const userFaculties = users.findAll().map((record) => ({ record, facultyId: record.facultyId }))
      faculties.deleteAll()
      facultyList.forEach((faculty) => faculties.insert(faculty))
      cohortList.forEach((cohort) => cohorts.insert(cohort))
      lessonList.forEach((lesson) => lessons.upsert(lesson))
      catalogList.forEach((item) => catalog.insertRaw(item))
      if (body.settings !== undefined) settings.updatePublic(body.settings)

      const facultyIds = new Set(facultyList.map((faculty) => faculty.id))
      userFaculties.forEach(({ record, facultyId }) => {
        if (facultyId && facultyIds.has(facultyId)) users.update({ ...record, facultyId })
      })

      this.logRestore(user)
      return { mode: 'full' as const, faculties: facultyList.length, cohorts: cohortList.length, lessons: lessonList.length }
    })
  }

  /** Հին տարբերակի տվյալները միաձուլվում են ընթացիկ բազայի հետ (նույն վանդակները վերագրվում են)։ */
  private importLegacy(user: AuthUser, cells: LegacyCell[]): RestoreResult {
    if (cells.length === 0) throw badRequest('Ֆայլում դասեր չեն գտնվել')
    const { db, faculties, facultiesService, cohorts, lessons, catalogService } = this.deps

    return db.transaction(() => {
      const createdFaculties = new Set<string>()
      const touchedCohorts = new Map<string, Cohort>()

      const resolveCohort = (cell: LegacyCell): Cohort => {
        let faculty = faculties.findByName(cell.facultyName)
        if (!faculty) {
          faculty = facultiesService.create({ name: cell.facultyName })
          createdFaculties.add(faculty.id)
        }
        const key = `${faculty.id}|${cell.cohortName}`
        const cached = touchedCohorts.get(key)
        if (cached) return cached
        let cohort = cohorts.findByName(faculty.id, cell.cohortName)
        if (!cohort) {
          cohort = {
            id: createId(),
            facultyId: faculty.id,
            name: cell.cohortName,
            kind: /կուրս/.test(cell.cohortName) ? 'year' : 'program',
            sortOrder: cohorts.nextSortOrder(faculty.id),
            settings: { streams: [1, 2, 3, 4].map(createStream), days: DAY_KEYS.slice(0, 5), daySlotStart: {} },
          }
          cohorts.insert(cohort)
        }
        touchedCohorts.set(key, cohort)
        return cohort
      }

      const placed = cells.map((cell) => ({ cell, cohort: resolveCohort(cell) }))
      placed.forEach(({ cell, cohort }) => this.extendGrid(cohort, cell))
      touchedCohorts.forEach((cohort) => cohorts.update(cohort))

      placed.forEach(({ cell, cohort }) => {
        const existing = lessons.findOne({ cohortId: cohort.id, day: cell.day, slot: cell.slot, streamId: cell.streamId })
        lessons.upsert({
          id: existing?.id ?? createId(),
          cohortId: cohort.id,
          day: cell.day,
          slot: cell.slot,
          streamId: cell.streamId,
          parts: cell.parts,
          updatedAt: nowIso(),
          updatedBy: user.id,
        })
        catalogService.learnFromParts(cohort.facultyId, cell.parts)
      })

      this.logRestore(user)
      return { mode: 'legacy' as const, faculties: createdFaculties.size, cohorts: touchedCohorts.size, lessons: placed.length }
    })
  }

  /** Ընդլայնում է կուրսի աղյուսակը, որպեսզի հին դասը տեղավորվի (հոսք, օր, դասաժամ)։ */
  private extendGrid(cohort: Cohort, cell: LegacyCell): void {
    const { settings } = cohort
    const streamNumber = Number(cell.streamId.replace('stream-', ''))
    for (let index = settings.streams.length + 1; index <= Math.min(streamNumber, MAX_STREAMS); index++) {
      settings.streams.push(createStream(index))
    }
    if (!settings.days.includes(cell.day)) {
      settings.days = DAY_KEYS.filter((day: DayKey) => day === cell.day || settings.days.includes(day))
    }
    if (!getCohortDaySlots(cohort, cell.day).includes(cell.slot)) {
      const currentStart: SlotKey = settings.daySlotStart[cell.day] ?? '1-2'
      if (SLOT_KEYS.indexOf(cell.slot) < SLOT_KEYS.indexOf(currentStart)) settings.daySlotStart[cell.day] = cell.slot
    }
  }

  private logRestore(user: AuthUser): void {
    this.deps.changeLog.insert({
      userId: user.id,
      userName: user.displayName,
      facultyId: null,
      cohortId: null,
      cohortName: '',
      action: 'backup.restore',
      day: '',
      slot: '',
      streamId: '',
      before: null,
      after: null,
    })
  }
}
