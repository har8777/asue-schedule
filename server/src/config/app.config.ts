import { resolve } from 'node:path'

const readNumber = (value: string | undefined, fallback: number): number => {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

const readList = (value: string | undefined): string[] =>
  (value ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)

export const APP_CONFIG = {
  port: readNumber(process.env.PORT, 4000),
  host: process.env.HOST ?? '0.0.0.0',
  isProduction: process.env.NODE_ENV === 'production',
  /** true, եթե սերվերը աշխատում է reverse proxy-ի (nginx) հետևում և պետք է վստահել X-Forwarded-For-ին։ */
  trustProxy: process.env.TRUST_PROXY === 'true',
  databaseFile: resolve(process.env.DATABASE_FILE ?? './data/schedule.db'),
  jwtSecret: process.env.JWT_SECRET ?? '',
  jwtTtlSeconds: readNumber(process.env.JWT_TTL_SECONDS, 60 * 60 * 12),
  corsOrigins: readList(process.env.CORS_ORIGINS),
  clientDistDir: resolve(process.env.CLIENT_DIST_DIR ?? '../dist'),
  apiPrefix: '/api/v1',
  maxBodyBytes: 20 * 1024 * 1024,
  superAdmin: {
    username: process.env.SUPER_ADMIN_USERNAME ?? 'superadmin',
    password: process.env.SUPER_ADMIN_PASSWORD ?? '',
  },
} as const
