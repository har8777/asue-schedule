import { randomBytes } from 'node:crypto'
import { APP_CONFIG } from './config/app.config.ts'
import { Database } from './core/database/database.ts'
import { runMigrations } from './core/database/migrations.ts'
import { createHttpServer } from './core/http/http-server.ts'
import { Router } from './core/http/router.ts'
import { StaticFiles } from './core/http/static-files.ts'
import { JwtService } from './core/security/jwt.ts'
import { AUTH_CONSTANTS } from './modules/auth/auth.constants.ts'
import { createAuthController } from './modules/auth/auth.controller.ts'
import { createAuthGuards } from './modules/auth/auth.guards.ts'
import { AuthService } from './modules/auth/auth.service.ts'
import { createBackupController } from './modules/backup/backup.controller.ts'
import { BackupService } from './modules/backup/backup.service.ts'
import { createCatalogController } from './modules/catalog/catalog.controller.ts'
import { CatalogRepository } from './modules/catalog/catalog.repository.ts'
import { CatalogService } from './modules/catalog/catalog.service.ts'
import { createChangeLogController } from './modules/change-log/change-log.controller.ts'
import { ChangeLogRepository } from './modules/change-log/change-log.repository.ts'
import { createCohortsController } from './modules/cohorts/cohorts.controller.ts'
import { CohortsRepository } from './modules/cohorts/cohorts.repository.ts'
import { CohortsService } from './modules/cohorts/cohorts.service.ts'
import { createFacultiesController } from './modules/faculties/faculties.controller.ts'
import { FacultiesRepository } from './modules/faculties/faculties.repository.ts'
import { FacultiesService } from './modules/faculties/faculties.service.ts'
import { createLessonsController } from './modules/lessons/lessons.controller.ts'
import { LessonsRepository } from './modules/lessons/lessons.repository.ts'
import { LessonsService } from './modules/lessons/lessons.service.ts'
import { createReportsController } from './modules/reports/reports.controller.ts'
import { ReportsService } from './modules/reports/reports.service.ts'
import { createSettingsController } from './modules/settings/settings.controller.ts'
import { SettingsRepository } from './modules/settings/settings.repository.ts'
import { SettingsService } from './modules/settings/settings.service.ts'
import { createUsersController } from './modules/users/users.controller.ts'
import { UsersRepository } from './modules/users/users.repository.ts'
import { UsersService } from './modules/users/users.service.ts'
import { DATA_MIGRATIONS } from './seed/data-migrations.ts'
import { seedDatabase } from './seed/seed.service.ts'

type AppConfig = typeof APP_CONFIG

const resolveJwtSecret = (config: AppConfig, settings: SettingsRepository): string => {
  if (config.jwtSecret) return config.jwtSecret
  const stored = settings.get<string>(AUTH_CONSTANTS.SETTINGS_SECRET_KEY)
  if (stored) return stored
  const generated = randomBytes(48).toString('base64url')
  settings.set(AUTH_CONSTANTS.SETTINGS_SECRET_KEY, generated)
  return generated
}

/**
 * Composition root. բոլոր կախվածությունները ստեղծվում և միացվում են այստեղ
 * (Dependency Injection առանց framework-ի)։
 */
export const createApp = async (config: AppConfig = APP_CONFIG) => {
  const db = new Database(config.databaseFile)
  runMigrations(db, DATA_MIGRATIONS)

  // Repository-ներ
  const settingsRepository = new SettingsRepository(db)
  const facultiesRepository = new FacultiesRepository(db)
  const cohortsRepository = new CohortsRepository(db)
  const lessonsRepository = new LessonsRepository(db)
  const catalogRepository = new CatalogRepository(db)
  const usersRepository = new UsersRepository(db)
  const changeLogRepository = new ChangeLogRepository(db)

  // Ծառայություններ
  const jwt = new JwtService(resolveJwtSecret(config, settingsRepository), config.jwtTtlSeconds)
  const settingsService = new SettingsService(settingsRepository)
  const usersService = new UsersService(usersRepository, facultiesRepository)
  const authService = new AuthService(usersRepository, usersService, jwt)
  const catalogService = new CatalogService(catalogRepository, facultiesRepository)
  const facultiesService = new FacultiesService(db, facultiesRepository, cohortsRepository, lessonsRepository, changeLogRepository)
  const cohortsService = new CohortsService(db, cohortsRepository, facultiesRepository, lessonsRepository, changeLogRepository)
  const lessonsService = new LessonsService(
    db,
    lessonsRepository,
    cohortsRepository,
    facultiesRepository,
    catalogService,
    changeLogRepository,
  )
  const reportsService = new ReportsService(lessonsRepository, catalogRepository, facultiesRepository)
  const backupService = new BackupService({
    db,
    faculties: facultiesRepository,
    facultiesService,
    cohorts: cohortsRepository,
    cohortsService,
    lessons: lessonsRepository,
    catalog: catalogRepository,
    catalogService,
    settings: settingsService,
    users: usersRepository,
    changeLog: changeLogRepository,
  })

  await seedDatabase({
    db,
    faculties: facultiesRepository,
    facultiesService,
    cohorts: cohortsRepository,
    catalog: catalogRepository,
    users: usersRepository,
    superAdmin: config.superAdmin,
  })

  // Route-եր
  const guards = createAuthGuards(authService)
  const router = new Router(config.apiPrefix)
    .get('/health', () => ({ status: 'ok', time: new Date().toISOString() }))
    .use(createAuthController(authService, guards))
    .use(createUsersController(usersService, guards))
    .use(createSettingsController(settingsService, guards))
    .use(createFacultiesController(facultiesService, guards))
    .use(createCohortsController(cohortsService, guards))
    .use(createLessonsController(lessonsService, guards))
    .use(createCatalogController(catalogService, lessonsRepository, guards))
    .use(createReportsController(reportsService, guards))
    .use(createChangeLogController(changeLogRepository, guards))
    .use(createBackupController(backupService, guards))

  const staticFiles = new StaticFiles(config.clientDistDir)
  const server = createHttpServer({
    router,
    apiPrefix: config.apiPrefix,
    corsOrigins: config.corsOrigins,
    maxBodyBytes: config.maxBodyBytes,
    staticFiles,
    isProduction: config.isProduction,
    trustProxy: config.trustProxy,
  })

  return { server, db, staticFiles }
}
