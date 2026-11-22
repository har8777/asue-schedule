import assert from 'node:assert/strict'
import type { AddressInfo } from 'node:net'
import { after, before, describe, it } from 'node:test'
import { createApp } from '../src/app.ts'
import { APP_CONFIG } from '../src/config/app.config.ts'

/**
 * Հրապարակման թեստեր. նոր ֆակուլտետն ու կուրսը մնում են սևագիր՝ մինչև
 * գլխավոր ադմինի հրապարակումը, և չեն երևում ոչ ադմինների, ոչ ուսանողների մոտ։
 */
const SUPER_PASSWORD = 'SuperSecret123'
const ADMIN_PASSWORD = 'AdminPass123'

let baseUrl = ''
let closeApp: () => Promise<void>
let superToken = ''
let adminToken = ''
let draftFacultyId = ''
let draftCohortId = ''
let liveCohortId = ''

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

const login = async (username: string, password: string): Promise<string> => {
  const { status, body } = await api('POST', '/auth/login', { body: { username, password } })
  assert.equal(status, 200, `Մուտքը ձախողվեց ${username}-ի համար`)
  return body.token
}

const facultyIds = async (token?: string): Promise<string[]> =>
  (await api('GET', '/faculties', { token })).body.map((faculty: any) => faculty.id)

before(async () => {
  const originalLog = console.log
  const originalTable = console.table
  console.log = () => {}
  console.table = () => {}
  const { server, db } = await createApp({
    ...APP_CONFIG,
    databaseFile: ':memory:',
    jwtSecret: 'test-secret',
    clientDistDir: '/nonexistent',
    superAdmin: { username: 'superadmin', password: SUPER_PASSWORD },
  })
  console.log = originalLog
  console.table = originalTable

  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
  closeApp = () => new Promise((resolve) => server.close(() => (db.close(), resolve())))

  superToken = await login('superadmin', SUPER_PASSWORD)
  await api('POST', '/users', {
    token: superToken,
    body: {
      username: 'finance.admin',
      displayName: 'finance.admin',
      password: ADMIN_PASSWORD,
      role: 'ADMIN',
      facultyId: 'finance',
    },
  })
  adminToken = await login('finance.admin', ADMIN_PASSWORD)
  liveCohortId = (await api('GET', '/faculties/finance')).body.cohorts[0].id
})

after(async () => {
  await closeApp()
})

describe('Ֆակուլտետի և կուրսի հրապարակում', () => {
  it('սերմնացված ֆակուլտետները հրապարակված են', async () => {
    assert.equal((await facultyIds()).length, 6)
  })

  it('նոր ֆակուլտետը սևագիր է և չի երևում առանց մուտքի', async () => {
    const created = await api('POST', '/faculties', { token: superToken, body: { name: 'Փորձնական ֆակուլտետ' } })
    assert.equal(created.status, 201)
    assert.equal(created.body.isPublished, false)
    draftFacultyId = created.body.id

    assert.ok(!(await facultyIds()).includes(draftFacultyId), 'Ուսանողը չպետք է տեսնի սևագիրը')
    assert.ok(!(await facultyIds(adminToken)).includes(draftFacultyId), 'Ադմինը չպետք է տեսնի սևագիրը')
    assert.ok((await facultyIds(superToken)).includes(draftFacultyId), 'Գլխավոր ադմինը տեսնում է սևագիրը')

    assert.equal((await api('GET', `/faculties/${draftFacultyId}`)).status, 404)
    assert.equal((await api('GET', `/faculties/${draftFacultyId}`, { token: superToken })).status, 200)
  })

  it('սևագիր ֆակուլտետի կուրսի դասացուցակը հասանելի չէ', async () => {
    const cohortId = (await api('GET', `/faculties/${draftFacultyId}`, { token: superToken })).body.cohorts[0].id
    assert.equal((await api('GET', `/cohorts/${cohortId}/schedule`)).status, 404)
    assert.equal((await api('GET', `/cohorts/${cohortId}/schedule`, { token: superToken })).status, 200)
  })

  it('հրապարակումից հետո ֆակուլտետը երևում է բոլորին', async () => {
    const published = await api('POST', `/faculties/${draftFacultyId}/publish`, { token: superToken })
    assert.equal(published.status, 200)
    assert.equal(published.body.isPublished, true)
    assert.ok((await facultyIds()).includes(draftFacultyId))
    assert.ok((await facultyIds(adminToken)).includes(draftFacultyId))
  })

  it('նոր կուրսը սևագիր է՝ հրապարակված ֆակուլտետում անգամ', async () => {
    const created = await api('POST', '/faculties/finance/cohorts', {
      token: superToken,
      body: { name: 'Հեռակա փորձնական', kind: 'program' },
    })
    assert.equal(created.status, 201)
    assert.equal(created.body.isPublished, false)
    draftCohortId = created.body.id

    const publicCohorts = (await api('GET', '/faculties/finance')).body.cohorts.map((c: any) => c.id)
    assert.ok(!publicCohorts.includes(draftCohortId), 'Սևագիր կուրսը չպետք է երևա')
    assert.ok(publicCohorts.includes(liveCohortId), 'Հին կուրսերը մնում են տեսանելի')

    assert.equal((await api('GET', `/cohorts/${draftCohortId}`)).status, 404)
    assert.equal((await api('GET', `/cohorts/${draftCohortId}/schedule`, { token: adminToken })).status, 404)
    assert.equal((await api('GET', `/cohorts/${draftCohortId}/schedule`, { token: superToken })).status, 200)
  })

  it('սևագիր կուրսի դասերը չեն երևում դասախոսի հանրային դասացուցակում', async () => {
    const saved = await api('PUT', `/cohorts/${draftCohortId}/lessons`, {
      token: superToken,
      body: {
        day: 'monday',
        slot: '1-2',
        streamId: 'stream-1',
        parts: [{ subject: 'Գաղտնի դաս', lecturers: ['Սևագիր Դասախոս'], rooms: ['999'] }],
      },
    })
    assert.equal(saved.status, 200)

    const asGuest = await api('GET', '/reports/lecturer-schedule?name=' + encodeURIComponent('Սևագիր Դասախոս'))
    assert.equal(asGuest.body.length, 0, 'Ուսանողը չպետք է տեսնի սևագիր կուրսի դասը')

    const asSuper = await api('GET', '/reports/lecturer-schedule?name=' + encodeURIComponent('Սևագիր Դասախոս'), {
      token: superToken,
    })
    assert.equal(asSuper.body.length, 1, 'Գլխավոր ադմինը տեսնում է նաև սևագիրը')
  })

  it('ադմինը չի կարող հրապարակել', async () => {
    assert.equal((await api('POST', `/cohorts/${draftCohortId}/publish`, { token: adminToken })).status, 403)
  })

  it('հրապարակումից հետո կուրսը և նրա դասերը տեսանելի են', async () => {
    const published = await api('POST', `/cohorts/${draftCohortId}/publish`, { token: superToken })
    assert.equal(published.status, 200)
    assert.equal(published.body.isPublished, true)

    const publicCohorts = (await api('GET', '/faculties/finance')).body.cohorts.map((c: any) => c.id)
    assert.ok(publicCohorts.includes(draftCohortId))
    assert.equal((await api('GET', `/cohorts/${draftCohortId}/schedule`)).status, 200)

    const asGuest = await api('GET', '/reports/lecturer-schedule?name=' + encodeURIComponent('Սևագիր Դասախոս'))
    assert.equal(asGuest.body.length, 1)
  })

  it('հրապարակվածը կարելի է հետ բերել սևագրի', async () => {
    assert.equal((await api('POST', `/cohorts/${draftCohortId}/unpublish`, { token: superToken })).status, 200)
    const publicCohorts = (await api('GET', '/faculties/finance')).body.cohorts.map((c: any) => c.id)
    assert.ok(!publicCohorts.includes(draftCohortId))
  })

  it('հաշվում է սևագրերի քանակը', async () => {
    const { status, body } = await api('GET', '/faculties/drafts/count', { token: superToken })
    assert.equal(status, 200)
    assert.equal(body.faculties, 0)
    assert.equal(body.cohorts, 1)
  })
})
