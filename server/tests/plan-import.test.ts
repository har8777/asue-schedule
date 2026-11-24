import assert from 'node:assert/strict'
import type { AddressInfo } from 'node:net'
import { after, before, describe, it } from 'node:test'
import { createApp } from '../src/app.ts'
import { APP_CONFIG } from '../src/config/app.config.ts'

/**
 * Excel-ից դասընթացների ներմուծման թեստեր՝ իրավունքներ, անունների ճանաչում,
 * սխալ տողերի մշակում, ռեժիմներ և սևագրում մնալը։
 */
const SUPER_PASSWORD = 'SuperSecret123'
const ADMIN_PASSWORD = 'AdminPass123'

let baseUrl = ''
let closeApp: () => Promise<void>
let superToken = ''
let financeToken = ''
let financeCohortName = ''
let financeCohortId = ''
let managementCohortName = ''

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

const importRows = (rows: unknown[], mode?: string, token = superToken) =>
  api('POST', '/curriculum/import', { token, body: mode === undefined ? { rows } : { rows, mode } })

const draftSubjects = async (cohortId: string): Promise<{ subject: string; hours: number }[]> =>
  (await api('GET', `/cohorts/${cohortId}/plan`, { token: superToken })).body.draft.subjects

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
  financeToken = await login('finance.admin', ADMIN_PASSWORD)

  const faculties = (await api('GET', '/faculties')).body
  const finance = faculties.find((item: any) => item.id === 'finance')
  const management = faculties.find((item: any) => item.id === 'management')
  financeCohortId = finance.cohorts[0].id
  financeCohortName = finance.cohorts[0].name
  managementCohortName = management.cohorts[0].name
})

after(async () => {
  await closeApp()
})

describe('Դասընթացների ներմուծում Excel-ից', () => {
  it('ներմուծում է միայն գլխավոր ադմինը', async () => {
    const asAdmin = await importRows(
      [{ facultyName: 'Կիրառական ֆինանսների ֆակուլտետ', cohortName: financeCohortName, subject: 'Ապահովագրություն', hours: 32 }],
      undefined,
      financeToken,
    )
    assert.equal(asAdmin.status, 403)

    const asGuest = await api('POST', '/curriculum/import', { body: { rows: [] } })
    assert.equal(asGuest.status, 401)
  })

  it('ճանաչում է ֆակուլտետը լրիվ և կարճ անունով, մի քանի կուրս՝ մեկ ֖այլում', async () => {
    const { status, body } = await importRows([
      { facultyName: 'Կիրառական ֆինանսների ֆակուլտետ', cohortName: financeCohortName, subject: 'Ապահովագրություն', hours: 32 },
      // Կարճ անունը նույնպես ընդունվում է
      { facultyName: 'Ֆինանսներ', cohortName: financeCohortName, subject: 'Հարկային համակարգ', hours: 16 },
      // Այլ ֆակուլտետի տողը գնում է իր կուրսի պլան
      { facultyName: 'Կառավարում', cohortName: managementCohortName, subject: 'Մենեջմենթ', hours: 48 },
    ])

    assert.equal(status, 200)
    assert.equal(body.totalAdded, 3)
    assert.equal(body.skipped.length, 0)
    assert.equal(body.cohorts.length, 2, 'Երկու տարբեր կուրս պետք է թարմացվեր')

    const subjects = await draftSubjects(financeCohortId)
    assert.equal(subjects.find((item) => item.subject === 'Ապահովագրություն')?.hours, 32)
    assert.equal(subjects.find((item) => item.subject === 'Հարկային համակարգ')?.hours, 16)
  })

  it('ներմուծվածը մնում է սևագրում՝ ֆակուլտետի ադմինը չի տեսնում', async () => {
    const asAdmin = await api('GET', `/cohorts/${financeCohortId}/plan`, { token: financeToken })
    assert.equal(asAdmin.status, 200)
    assert.equal(asAdmin.body.draft, null, 'Սևագիրը չպետք է երևա ADMIN-ին')
    assert.equal(asAdmin.body.published, null, 'Առանց հաստատման հրապարակված պլան չկա')
  })

  it('cohortId-ով ներմուծումը աշխատում է առանց ֆակուլտետի և կուրսի անունների', async () => {
    const { status, body } = await importRows([{ cohortId: financeCohortId, subject: 'Վիճակագրություն', hours: 64 }])
    assert.equal(status, 200)
    assert.equal(body.totalAdded, 1)
    assert.equal((await draftSubjects(financeCohortId)).find((item) => item.subject === 'Վիճակագրություն')?.hours, 64)
  })

  it('եղած դասընթացի ժամաքանակը թարմացվում է, նույնը՝ մնում անփոփոխ', async () => {
    const updated = await importRows([{ cohortId: financeCohortId, subject: 'Ապահովագրություն', hours: 48 }])
    assert.equal(updated.body.totalUpdated, 1)
    assert.equal(updated.body.totalAdded, 0)
    assert.equal((await draftSubjects(financeCohortId)).find((item) => item.subject === 'Ապահովագրություն')?.hours, 48)

    const again = await importRows([{ cohortId: financeCohortId, subject: 'Ապահովագրություն', hours: 48 }])
    assert.equal(again.body.cohorts[0].unchanged, 1)
    assert.equal(again.body.totalUpdated, 0)
  })

  it('սխալ տողերը բաց են թողնվում՝ մնացածը ներմուծվում է', async () => {
    const { status, body } = await importRows([
      { cohortId: financeCohortId, subject: 'Աուդիտ', hours: 32 },
      { facultyName: 'Գոյություն չունեցող ֆակուլտետ', cohortName: '1-ին կուրս', subject: 'Սխալ', hours: 32 },
      { facultyName: 'Ֆինանսներ', cohortName: '99-րդ կուրս', subject: 'Սխալ կուրս', hours: 32 },
      { cohortId: financeCohortId, subject: 'Առանց ժամի', hours: 0 },
      { cohortId: financeCohortId, subject: '', hours: 32 },
    ])

    assert.equal(status, 200)
    assert.equal(body.totalAdded, 1, 'Միայն ճիշտ տողը պետք է ներմուծվեր')
    assert.equal(body.skipped.length, 4)
    // Տողի համարը ցույց է տրվում ֖այլի համարակալմամբ (վերնագիրը՝ 1-ին տող)
    assert.deepEqual(
      body.skipped.map((item: any) => item.row),
      [3, 4, 5, 6],
    )
    assert.ok(body.skipped[0].reason.includes('ֆակուլտետը չի գտնվել'))
    assert.ok(body.skipped[1].reason.includes('կուրսը չի գտնվել'))
  })

  it('replace ռեժիմը փոխարինում է կուրսի ցուցակը', async () => {
    const before = await draftSubjects(financeCohortId)
    assert.ok(before.length > 1, 'Նախապես մի քանի դասընթաց պետք է լիներ')

    const { status, body } = await importRows(
      [{ cohortId: financeCohortId, subject: 'Միայն սա', hours: 32 }],
      'replace',
    )
    assert.equal(status, 200)
    assert.equal(body.cohorts[0].removed, before.length)

    const after = await draftSubjects(financeCohortId)
    assert.deepEqual(
      after.map((item) => item.subject),
      ['Միայն սա'],
    )
  })

  it('դատարկ ցուցակը և անվավեր ռեժիմը մերժվում են', async () => {
    assert.equal((await importRows([])).status, 400)
    assert.equal((await importRows([{ cohortId: financeCohortId, subject: 'Սա', hours: 32 }], 'delete-all')).status, 400)
  })
})
