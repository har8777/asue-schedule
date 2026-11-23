import type { Database } from './database.ts'

/** Սխեմայի (sql) կամ տվյալների (run) միգրացիա։ Յուրաքանչյուրը կիրառվում է միայն մեկ անգամ։ */
export interface Migration {
  version: number
  name: string
  sql?: string
  run?: (db: Database) => void
}

const MIGRATIONS: Migration[] = [
  {
    version: 1,
    name: 'initial-schema',
    sql: `
      CREATE TABLE settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );

      CREATE TABLE faculties (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        short_name TEXT NOT NULL DEFAULT '',
        building TEXT NOT NULL DEFAULT '',
        sort_order INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL
      );

      CREATE TABLE cohorts (
        id TEXT PRIMARY KEY,
        faculty_id TEXT NOT NULL REFERENCES faculties(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        kind TEXT NOT NULL DEFAULT 'year' CHECK (kind IN ('year', 'program')),
        sort_order INTEGER NOT NULL DEFAULT 0,
        settings TEXT NOT NULL,
        UNIQUE (faculty_id, name)
      );

      CREATE TABLE lessons (
        id TEXT PRIMARY KEY,
        cohort_id TEXT NOT NULL REFERENCES cohorts(id) ON DELETE CASCADE,
        day TEXT NOT NULL,
        slot TEXT NOT NULL,
        stream_id TEXT NOT NULL,
        parts TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        updated_by TEXT,
        UNIQUE (cohort_id, day, slot, stream_id)
      );
      CREATE INDEX idx_lessons_day_slot ON lessons (day, slot);

      CREATE TABLE catalog_items (
        id TEXT PRIMARY KEY,
        faculty_id TEXT NOT NULL REFERENCES faculties(id) ON DELETE CASCADE,
        type TEXT NOT NULL CHECK (type IN ('subject', 'lecturer', 'room')),
        name TEXT NOT NULL,
        floor TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL,
        UNIQUE (faculty_id, type, name)
      );

      CREATE TABLE users (
        id TEXT PRIMARY KEY,
        username TEXT NOT NULL UNIQUE COLLATE NOCASE,
        display_name TEXT NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL CHECK (role IN ('SUPER_ADMIN', 'ADMIN')),
        faculty_id TEXT REFERENCES faculties(id) ON DELETE SET NULL,
        is_active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE change_log (
        id TEXT PRIMARY KEY,
        created_at TEXT NOT NULL,
        user_id TEXT,
        user_name TEXT NOT NULL,
        faculty_id TEXT,
        cohort_id TEXT,
        cohort_name TEXT NOT NULL DEFAULT '',
        action TEXT NOT NULL,
        day TEXT NOT NULL DEFAULT '',
        slot TEXT NOT NULL DEFAULT '',
        stream_id TEXT NOT NULL DEFAULT '',
        before_value TEXT,
        after_value TEXT
      );
      CREATE INDEX idx_change_log_created ON change_log (created_at DESC);
    `,
  },
  {
    version: 2,
    name: 'separate-faculty-buildings',
    // Ֆակուլտետները առանձին մասնաշենքերում են. դատարկ մասնաշենքը փոխարինվում է ֆակուլտետի անունով
    sql: `UPDATE faculties SET building = name WHERE building = '';`,
  },
  {
    version: 4,
    name: 'cohort-curriculum-plans',
    // Ուսումնական պլան. սևագիրը տեսնում է միայն super admin-ը, հաստատվածը՝ բոլորը
    sql: `
      CREATE TABLE cohort_plans (
        cohort_id TEXT PRIMARY KEY REFERENCES cohorts(id) ON DELETE CASCADE,
        draft TEXT NOT NULL,
        published TEXT,
        updated_at TEXT NOT NULL,
        published_at TEXT,
        published_by TEXT
      );
    `,
  },
  {
    version: 5,
    name: 'faculty-cohort-publishing',
    // Նոր ֆակուլտետն ու կուրսը մնում են սևագիր՝ մինչև գլխավոր ադմինի հրապարակումը։
    // Առկա տվյալները մնում են հրապարակված, որպեսզի ոչինչ չանհետանա։
    sql: `
      ALTER TABLE faculties ADD COLUMN is_published INTEGER NOT NULL DEFAULT 1;
      ALTER TABLE cohorts ADD COLUMN is_published INTEGER NOT NULL DEFAULT 1;
    `,
  },
  {
    version: 6,
    name: 'faculty-divisions-and-dean',
    // Ֆակուլտետին կցված բաժին (օր.՝ «Հեռակա»)՝ մայր ֆակուլտետի ներսում, առանձին խմբով։
    // Դատարկ building նշանակում է, որ բաժինը օգտագործում է մայր ֆակուլտետի լսարանները։
    sql: `
      CREATE TABLE faculty_divisions (
        id TEXT PRIMARY KEY,
        faculty_id TEXT NOT NULL REFERENCES faculties(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        building TEXT NOT NULL DEFAULT '',
        sort_order INTEGER NOT NULL DEFAULT 0,
        is_published INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        UNIQUE (faculty_id, name)
      );
      CREATE INDEX idx_divisions_faculty ON faculty_divisions (faculty_id);

      ALTER TABLE cohorts ADD COLUMN division_id TEXT REFERENCES faculty_divisions(id) ON DELETE SET NULL;
      ALTER TABLE faculties ADD COLUMN dean TEXT NOT NULL DEFAULT '';
    `,
  },
  {
    version: 7,
    name: 'cohort-study-form',
    // Առկա և հեռակա ուսուցման դասացուցակներն ունեն տարբեր ձևաչափ
    sql: `ALTER TABLE cohorts ADD COLUMN study_form TEXT NOT NULL DEFAULT 'full_time';`,
  },
  {
    version: 8,
    name: 'detect-existing-part-time-cohorts',
    // Արդեն ստեղծված «Հեռակա …» կուրսերը ստանում են հեռակա ուսուցման ձևաչափը
    sql: `
      UPDATE cohorts SET study_form = 'part_time'
      WHERE study_form = 'full_time'
        AND (name LIKE '%Հեռակա%'
             OR division_id IN (SELECT id FROM faculty_divisions WHERE name LIKE '%Հեռակա%'));
    `,
  },
]

/**
 * Կիրառում է դեռ չկիրառված միգրացիաները՝ ըստ տարբերակի։ Տվյալների միգրացիաները
 * (օր.՝ տեղեկատուի թարմացում) փոխանցվում են դրսից, որպեսզի core-ը կախված չլինի մոդուլներից։
 */
export const runMigrations = (db: Database, dataMigrations: Migration[] = []): void => {
  db.exec('CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY, name TEXT NOT NULL, applied_at TEXT NOT NULL)')
  const applied = new Set(db.all<{ version: number }>('SELECT version FROM schema_migrations').map((row) => row.version))

  const all = [...MIGRATIONS, ...dataMigrations].sort((a, b) => a.version - b.version)
  for (const migration of all) {
    if (applied.has(migration.version)) continue
    db.transaction(() => {
      if (migration.sql) db.exec(migration.sql)
      migration.run?.(db)
      db.run(
        'INSERT INTO schema_migrations (version, name, applied_at) VALUES (?, ?, ?)',
        migration.version,
        migration.name,
        new Date().toISOString(),
      )
    })
    console.log(`[DB] Կիրառվեց միգրացիա #${migration.version} (${migration.name})`)
  }
}
