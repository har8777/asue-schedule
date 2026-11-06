import type { Database } from '../core/database/database.ts'
import { generatePassword, passwordHasher } from '../core/security/password-hasher.ts'
import { createId, nowIso } from '../core/utils/id.ts'
import { USER_ROLES } from '../modules/auth/auth.constants.ts'
import type { CatalogRepository } from '../modules/catalog/catalog.repository.ts'
import { createDefaultCohortSettings } from '../modules/cohorts/cohorts.constants.ts'
import type { CohortsRepository } from '../modules/cohorts/cohorts.repository.ts'
import type { FacultiesRepository } from '../modules/faculties/faculties.repository.ts'
import type { FacultiesService } from '../modules/faculties/faculties.service.ts'
import type { UsersRepository } from '../modules/users/users.repository.ts'
import { COMMON_SUBJECTS, SEED_FACULTIES } from './seed.data.ts'

interface SeedDependencies {
  db: Database
  faculties: FacultiesRepository
  facultiesService: FacultiesService
  cohorts: CohortsRepository
  catalog: CatalogRepository
  users: UsersRepository
  superAdmin: { username: string; password: string }
}

interface CreatedAccount {
  username: string
  password: string
  role: string
}

/**
 * Առաջին գործարկման ժամանակ լրացնում է դատարկ բազան։ Գոյություն ունեցող
 * տվյալներին չի դիպչում (կրկնակի գործարկումն անվտանգ է)։
 */
export const seedDatabase = async (deps: SeedDependencies): Promise<void> => {
  const { db, faculties, facultiesService, cohorts, catalog, users, superAdmin } = deps

  if (faculties.findAll().length === 0) {
    db.transaction(() => {
      for (const seed of SEED_FACULTIES) {
        facultiesService.create({ name: seed.name, shortName: seed.shortName }, seed.id)
        seed.programs.forEach((name) =>
          cohorts.insert({
            id: createId(),
            facultyId: seed.id,
            name,
            kind: 'program',
            sortOrder: cohorts.nextSortOrder(seed.id),
            settings: createDefaultCohortSettings(),
          }),
        )
        ;[...seed.subjects, ...COMMON_SUBJECTS].forEach((name) => catalog.insertIfMissing(seed.id, 'subject', name))
        seed.lecturers.forEach((name) => catalog.insertIfMissing(seed.id, 'lecturer', name))
        Object.entries(seed.rooms).forEach(([floor, rooms]) =>
          rooms.forEach((room) => catalog.insertIfMissing(seed.id, 'room', room, floor)),
        )
      }
    })
    console.log(`[Seed] Ստեղծվեց ${SEED_FACULTIES.length} ֆակուլտետ՝ կուրսերով և տեղեկատուներով`)
  }

  if (users.count() > 0) return

  const created: CreatedAccount[] = []
  const createUser = async (username: string, displayName: string, role: 'SUPER_ADMIN' | 'ADMIN', facultyId: string | null, password: string) => {
    const now = nowIso()
    users.insert({
      id: createId(),
      username,
      displayName,
      passwordHash: await passwordHasher.hash(password),
      role,
      facultyId,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    })
    created.push({ username, password, role: role === USER_ROLES.SUPER_ADMIN ? 'Գլխավոր ադմին' : `Ադմին (${displayName})` })
  }

  await createUser(
    superAdmin.username,
    'Գլխավոր ադմինիստրատոր',
    USER_ROLES.SUPER_ADMIN,
    null,
    superAdmin.password || generatePassword(),
  )
  for (const seed of SEED_FACULTIES) {
    if (faculties.findById(seed.id)) {
      await createUser(seed.adminUsername, seed.shortName, USER_ROLES.ADMIN, seed.id, generatePassword())
    }
  }

  console.log('\n[Seed] Ստեղծվեցին հաշիվներ։ Պահպանեք գաղտնաբառերը, դրանք այլևս չեն ցուցադրվի։')
  console.table(created)
}
