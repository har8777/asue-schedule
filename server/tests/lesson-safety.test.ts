import assert from 'node:assert/strict'
import type { AddressInfo } from 'node:net'
import { after, before, describe, it } from 'node:test'
import { createApp } from '../src/app.ts'
import { APP_CONFIG } from '../src/config/app.config.ts'
import type { Database } from '../src/core/database/database.ts'

/**
 * Չճանաչված օրով դասերը (օր.՝ «2026-11-24») գրված են այլ մոդելով։ Ոչ կուրսի
 * կարգավորումները պահպանելը, ոչ ուսումնական պլանը հաստատելը չպետք է դրանք ջնջի։
 */
const SUPER_PASSWORD = 'SuperSecret123'

let baseUrl = ''
let db: Database
let closeApp: () => Promise<void>
let superToken = ''
let cohortId = ''

const api = async <T = any>(
  method: string,
  path: string,
  options: { token?: string; body?: unknown } = {},
): Promise<{ status: number; body: T }> => {
  const response = await fetch(`${baseUrl}/api/v1${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  })
  const text = await response.text()
  return { status: response.status, body: text ? JSON.parse(text) : (undefined as T) }
}

/** Ամսաթվային օրով դաս՝ ուղիղ բազայում, որովհետև API-ն այդպիսին չի ընդունում։ */
const insertDateLesson = (day: string, slot: string, streamId: string): void => {
  db.run(
    'INSERT INTO lessons (id, cohort_id, day, slot, stream_id, parts, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    `lesson-${day}-${slot}-${streamId}`,
    cohortId,
    day,
    slot,
    streamId,
    JSON.stringify([{ subject: 'Նստաշրջանային դաս', lecturers: ['Դասախոս'], rooms: ['201'] }]),
    new Date().toISOString(),
  )
}

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
    superAdmin: { username: 'superadmin', password: SUPER_PASSWORD },
  })
  console.log = originalLog
  console.table = originalTable
  db = app.db

  await new Promise<void>((resolve) => app.server.listen(0, '127.0.0.1', resolve))
  baseUrl = `http://127.0.0.1:${(app.server.address() as AddressInfo).port}`
  closeApp = () => new Promise((resolve) => app.server.close(() => (db.close(), resolve())))

  superToken = (await api('POST', '/auth/login', { body: { username: 'superadmin', password: SUPER_PASSWORD } })).body.token
  const faculties = (await api('GET', '/faculties')).body
  cohortId = faculties.find((item: any) => item.id === 'management').cohorts[0].id
})

after(async () => {
  await closeApp()
})

describe('Չճանաչված օրով դասերը չեն ջնջվում', () => {
  it('ուսումնական պլանը հաստատելը դրանք պահում է', async () => {
    insertDateLesson('2026-11-09', '5-6', 'stream-1')
    insertDateLesson('2026-11-10', '7-8', 'stream-1')

    // Սովորական դաս, որը ցանցից դուրս կմնա պլանը հաստատելուց հետո
    await api('PUT', `/cohorts/${cohortId}/lessons`, {
      token: superToken,
      body: {
        day: 'friday',
        slot: '1-2',
        streamId: 'stream-1',
        parts: [{ subject: 'Սովորական դաս', lecturers: [], rooms: [] }],
      },
    })

    // Պլանում թողնում ենք միայն երկուշաբթին → ուրբաթվա դասը դուրս է մնում
    await api('PATCH', `/cohorts/${cohortId}/plan`, {
      token: superToken,
      body: { subjects: [{ subject: 'Մենեջմենթ', hours: 32 }], days: ['monday'] },
    })
    const { status, body } = await api('POST', `/cohorts/${cohortId}/plan/publish`, { token: superToken })

    assert.equal(status, 200)
    assert.equal(body.removedLessons, 1, 'Ուրբաթվա դասը պետք է ջնջվեր')
    assert.equal(body.keptUnknownLessons, 2, 'Ամսաթվային երկու դասը պետք է պահվեր')

    const rows = db.all<{ day: string }>('SELECT day FROM lessons WHERE cohort_id = ?', cohortId)
    const days = rows.map((row) => row.day).sort()
    assert.deepEqual(days, ['2026-11-09', '2026-11-10'])
  })

  it('կուրսի կարգավորումները պահպանելը նույնպես դրանք պահում է', async () => {
    const { status, body } = await api('PATCH', `/cohorts/${cohortId}`, {
      token: superToken,
      body: {
        settings: {
          streams: [{ id: 'stream-1', name: '1-ին հոսք' }],
          days: ['tuesday'],
          daySlotStart: {},
        },
      },
    })

    assert.equal(status, 200)
    assert.equal(body.keptUnknownLessons, 2, 'Ամսաթվային դասերը պետք է անփոփոխ մնային')

    const rows = db.all<{ day: string }>('SELECT day FROM lessons WHERE cohort_id = ?', cohortId)
    assert.equal(rows.length, 2)
  })
})
