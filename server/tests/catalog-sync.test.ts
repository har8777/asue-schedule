import assert from 'node:assert/strict'
import { after, before, describe, it } from 'node:test'
import { APP_CONFIG } from '../src/config/app.config.ts'
import { createApp } from '../src/app.ts'
import type { Database } from '../src/core/database/database.ts'
import { OFFICIAL_CATALOG } from '../src/seed/catalog.data.ts'
import { syncOfficialCatalog } from '../src/seed/catalog-sync.ts'

/**
 * Պաշտոնական տեղեկատուի (առարկաներ, դասախոսներ) թեստեր՝ նոր և արդեն գործող բազաների համար։
 */
let db: Database

const namesOf = (facultyId: string, type: 'subject' | 'lecturer') =>
  db
    .all<{ name: string }>('SELECT name FROM catalog_items WHERE faculty_id = ? AND type = ?', facultyId, type)
    .map((row) => row.name)

before(async () => {
  const originalLog = console.log
  const originalTable = console.table
  console.log = () => {}
  console.table = () => {}
  const app = await createApp({
    ...APP_CONFIG,
    databaseFile: ':memory:',
    jwtSecret: 'test-secret',
    clientDistDir: '/nonexistent',
    superAdmin: { username: 'superadmin', password: 'SuperSecret123' },
  })
  console.log = originalLog
  console.table = originalTable
  db = app.db
})

after(() => db.close())

describe('Պաշտոնական տեղեկատու', () => {
  it('նոր բազան լրացվում է Excel դասացուցակների առարկաներով և դասախոսներով', () => {
    for (const [facultyId, catalog] of Object.entries(OFFICIAL_CATALOG)) {
      assert.deepEqual(namesOf(facultyId, 'subject').sort(), [...catalog.subjects].sort(), `${facultyId} առարկաներ`)
      assert.deepEqual(namesOf(facultyId, 'lecturer').sort(), [...catalog.lecturers].sort(), `${facultyId} դասախոսներ`)
    }
  })

  it('տվյալները մաքուր են. կրկնություններ և դատարկ անուններ չկան, դասախոսը 2-3 բառ է', () => {
    for (const catalog of Object.values(OFFICIAL_CATALOG)) {
      assert.equal(new Set(catalog.subjects).size, catalog.subjects.length)
      assert.equal(new Set(catalog.lecturers).size, catalog.lecturers.length)
      for (const name of [...catalog.subjects, ...catalog.lecturers]) assert.equal(name, name.trim().replace(/\s+/g, ' '))
      for (const name of catalog.lecturers) assert.ok([2, 3].includes(name.split(' ').length), name)
    }
  })

  it('գործող բազայում հին անունները հեռացվում են, բայց դասերում օգտագործվածները պահպանվում են', () => {
    const now = new Date().toISOString()
    const cohortId = db.get<{ id: string }>("SELECT id FROM cohorts WHERE faculty_id = 'finance' LIMIT 1")!.id
    db.run(
      "INSERT INTO catalog_items (id, faculty_id, type, name, floor, created_at) VALUES ('old-1', 'finance', 'lecturer', 'Հին Դասախոս', '', ?)",
      now,
    )
    db.run(
      "INSERT INTO catalog_items (id, faculty_id, type, name, floor, created_at) VALUES ('old-2', 'finance', 'lecturer', 'Օգտագործված Դասախոս', '', ?)",
      now,
    )
    db.run("DELETE FROM catalog_items WHERE faculty_id = 'finance' AND name = 'Բանկային մենեջմենթ'")
    db.run(
      `INSERT INTO lessons (id, cohort_id, day, slot, stream_id, parts, updated_at, updated_by)
       VALUES ('lesson-1', ?, 'monday', '1-2', 'stream-1', ?, ?, NULL)`,
      cohortId,
      JSON.stringify([{ subject: 'Հին առարկա', lecturers: ['Օգտագործված Դասախոս'], rooms: [] }]),
      now,
    )

    const result = syncOfficialCatalog(db)

    const lecturers = namesOf('finance', 'lecturer')
    assert.ok(!lecturers.includes('Հին Դասախոս'), 'չօգտագործված հին անունը պետք է հեռացվի')
    assert.ok(lecturers.includes('Օգտագործված Դասախոս'), 'դասում օգտագործվածը պետք է մնա')
    assert.ok(namesOf('finance', 'subject').includes('Բանկային մենեջմենթ'), 'պակասողը պետք է ավելանա')
    assert.deepEqual(result, { added: 1, removed: 1 })
  })
})
