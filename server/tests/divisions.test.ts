import assert from 'node:assert/strict'
import type { AddressInfo } from 'node:net'
import { after, before, describe, it } from 'node:test'
import { createApp } from '../src/app.ts'
import { APP_CONFIG } from '../src/config/app.config.ts'

/**
 * Ֆակուլտետին կցված բաժինների թեստեր (օր.՝ «Հեռակա»)՝ ցուցադրում մայր
 * ֆակուլտետի ներսում, սեփական կամ ընդհանուր լսարաններ, դեկանի դաշտ։
 */
const SUPER_PASSWORD = 'SuperSecret123'

let baseUrl = ''
let closeApp: () => Promise<void>
let superToken = ''
let sharedDivisionId = ''
let ownDivisionId = ''

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

const lesson = (subject: string, lecturers: string[], rooms: string[]) => ({ subject, lecturers, rooms })

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

  superToken = (await api('POST', '/auth/login', { body: { username: 'superadmin', password: SUPER_PASSWORD } })).body
    .token
})

after(async () => {
  await closeApp()
})

describe('Ֆակուլտետի բաժիններ', () => {
  it('ստեղծում է կցված բաժին՝ 5 կուրսերով, սևագիր վիճակում', async () => {
    const created = await api('POST', '/faculties/finance/divisions', {
      token: superToken,
      body: { name: 'Հեռակա' },
    })
    assert.equal(created.status, 201)
    assert.equal(created.body.isPublished, false)
    assert.equal(created.body.building, '', 'Դատարկ մասնաշենք = մայր ֆակուլտետի լսարանները')
    sharedDivisionId = created.body.id

    const asSuper = (await api('GET', '/faculties/finance', { token: superToken })).body
    assert.equal(asSuper.divisions.length, 1)
    const divisionCohorts = asSuper.cohorts.filter((c: any) => c.divisionId === sharedDivisionId)
    assert.equal(divisionCohorts.length, 5, 'Բաժինը ստեղծվում է 5 կուրսերով')
    assert.ok(divisionCohorts.every((c: any) => c.name.startsWith('Հեռակա ')))

    const asGuest = (await api('GET', '/faculties/finance')).body
    assert.equal(asGuest.divisions.length, 0, 'Սևագիր բաժինը չի երևում')
    assert.equal(asGuest.cohorts.filter((c: any) => c.divisionId === sharedDivisionId).length, 0)
  })

  it('հրապարակումից հետո բաժինը և նրա կուրսերը երևում են', async () => {
    assert.equal((await api('POST', `/divisions/${sharedDivisionId}/publish`, { token: superToken })).status, 200)
    const asGuest = (await api('GET', '/faculties/finance')).body
    assert.equal(asGuest.divisions.length, 1)
    assert.equal(asGuest.divisions[0].name, 'Հեռակա')
    assert.equal(asGuest.cohorts.filter((c: any) => c.divisionId === sharedDivisionId).length, 5)
  })

  it('ընդհանուր լսարաններով բաժինը բախվում է մայր ֆակուլտետի հետ', async () => {
    const faculty = (await api('GET', '/faculties/finance')).body
    const mainCohort = faculty.cohorts.find((c: any) => c.divisionId === null)
    const divisionCohort = faculty.cohorts.find((c: any) => c.divisionId === sharedDivisionId)

    const first = await api('PUT', `/cohorts/${mainCohort.id}/lessons`, {
      token: superToken,
      body: { day: 'monday', slot: '1-2', streamId: 'stream-1', parts: [lesson('Ֆինանսներ', ['Դասախոս Ա'], ['201'])] },
    })
    assert.equal(first.status, 200)

    const sameRoom = await api('PUT', `/cohorts/${divisionCohort.id}/lessons`, {
      token: superToken,
      body: { day: 'monday', slot: '1-2', streamId: 'stream-1', parts: [lesson('Հաշվառում', ['Դասախոս Բ'], ['201'])] },
    })
    assert.equal(sameRoom.status, 409, 'Նույն լսարանը նույն ժամին՝ արգելվում է')
  })

  it('սեփական մասնաշենքով բաժինը չի բախվում մայր ֆակուլտետի լսարանների հետ', async () => {
    const created = await api('POST', '/faculties/finance/divisions', {
      token: superToken,
      body: { name: 'Երեկոյան', building: 'Երեկոյան մասնաշենք' },
    })
    assert.equal(created.status, 201)
    ownDivisionId = created.body.id
    await api('POST', `/divisions/${ownDivisionId}/publish`, { token: superToken })

    const faculty = (await api('GET', '/faculties/finance', { token: superToken })).body
    const eveningCohort = faculty.cohorts.find((c: any) => c.divisionId === ownDivisionId)

    const sameRoom = await api('PUT', `/cohorts/${eveningCohort.id}/lessons`, {
      token: superToken,
      body: { day: 'monday', slot: '1-2', streamId: 'stream-1', parts: [lesson('Տնտեսագիտություն', ['Դասախոս Գ'], ['201'])] },
    })
    assert.equal(sameRoom.status, 200, 'Այլ մասնաշենքի 201-ը ուրիշ լսարան է')
  })

  it('դասախոսը բախվում է նույնիսկ տարբեր մասնաշենքերում', async () => {
    const faculty = (await api('GET', '/faculties/finance', { token: superToken })).body
    const eveningCohort = faculty.cohorts.filter((c: any) => c.divisionId === ownDivisionId)[1]

    const sameLecturer = await api('PUT', `/cohorts/${eveningCohort.id}/lessons`, {
      token: superToken,
      body: { day: 'monday', slot: '1-2', streamId: 'stream-1', parts: [lesson('Վիճակագրություն', ['Դասախոս Ա'], ['401'])] },
    })
    assert.equal(sameLecturer.status, 409, 'Դասախոսը չի կարող լինել երկու տեղում')
  })

  it('պահպանում է դեկանի անունը', async () => {
    const updated = await api('PATCH', '/faculties/finance', {
      token: superToken,
      body: { dean: 'Դեկան Անուն Ազգանուն' },
    })
    assert.equal(updated.status, 200)
    assert.equal(updated.body.dean, 'Դեկան Անուն Ազգանուն')
    assert.equal((await api('GET', '/faculties')).body.find((f: any) => f.id === 'finance').dean, 'Դեկան Անուն Ազգանուն')
  })

  it('նույն անունով բաժին երկու անգամ չի ստեղծվում', async () => {
    const duplicate = await api('POST', '/faculties/finance/divisions', {
      token: superToken,
      body: { name: 'Հեռակա' },
    })
    assert.equal(duplicate.status, 409)
  })

  it('բաժինը ջնջելիս կուրսերը մնում են ֆակուլտետում', async () => {
    const before = (await api('GET', '/faculties/finance', { token: superToken })).body.cohorts.length
    assert.equal((await api('DELETE', `/divisions/${ownDivisionId}`, { token: superToken })).status, 204)
    const faculty = (await api('GET', '/faculties/finance', { token: superToken })).body
    assert.equal(faculty.cohorts.length, before, 'Կուրսերը չեն ջնջվում')
    assert.ok(faculty.cohorts.every((c: any) => c.divisionId !== ownDivisionId))
  })
})
