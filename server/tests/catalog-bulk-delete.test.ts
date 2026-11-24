import assert from 'node:assert/strict'
import type { AddressInfo } from 'node:net'
import { after, before, describe, it } from 'node:test'
import { createApp } from '../src/app.ts'
import { APP_CONFIG } from '../src/config/app.config.ts'

/** Տեղեկատուի խմբային ջնջում՝ իրավունքներ, ծավալ և ֆակուլտետների սահմանը։ */
const SUPER_PASSWORD = 'SuperSecret123'
const ADMIN_PASSWORD = 'AdminPass123'

let baseUrl = ''
let closeApp: () => Promise<void>
let superToken = ''
let financeToken = ''

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

const login = async (username: string, password: string): Promise<string> =>
  (await api('POST', '/auth/login', { body: { username, password } })).body.token

const catalogOf = async (facultyId: string) => (await api('GET', `/faculties/${facultyId}/catalog`)).body

const addSubject = async (facultyId: string, name: string, token: string): Promise<string> => {
  const { body } = await api('POST', `/faculties/${facultyId}/catalog`, { token, body: { type: 'subject', name } })
  return body.subjects.find((item: any) => item.name === name).id
}

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
})

after(async () => {
  await closeApp()
})

describe('Տեղեկատուի խմբային ջնջում', () => {
  it('ջնջում է միայն նշված id-ները, ոչ ամբողջ ֆակուլտետը', async () => {
    const keep = await addSubject('finance', 'Մնացող առարկա', superToken)
    const a = await addSubject('finance', 'Ջնջվող Ա', superToken)
    const b = await addSubject('finance', 'Ջնջվող Բ', superToken)

    const { status, body } = await api('POST', '/catalog/delete', { token: superToken, body: { itemIds: [a, b] } })
    assert.equal(status, 200)
    assert.equal(body.removed, 2)

    const names = body.catalog.subjects.map((item: any) => item.name)
    assert.ok(names.includes('Մնացող առարկա'), 'Չնշված տարրը պետք է մնար')
    assert.ok(!names.includes('Ջնջվող Ա'))
    assert.ok(!names.includes('Ջնջվող Բ'))
    assert.ok(keep.length > 0)
  })

  it('ֆակուլտետի ադմինը ջնջում է միայն իրենը', async () => {
    const ownItem = await addSubject('finance', 'Ֆինանսների առարկա', financeToken)
    const otherItem = await addSubject('management', 'Կառավարման առարկա', superToken)

    const own = await api('POST', '/catalog/delete', { token: financeToken, body: { itemIds: [ownItem] } })
    assert.equal(own.status, 200)

    const other = await api('POST', '/catalog/delete', { token: financeToken, body: { itemIds: [otherItem] } })
    assert.equal(other.status, 403, 'Ուրիշ ֆակուլտետի տարրը չպետք է ջնջվեր')

    const stillThere = (await catalogOf('management')).subjects.map((item: any) => item.name)
    assert.ok(stillThere.includes('Կառավարման առարկա'))
  })

  it('խառը ֆակուլտետների ցուցակը մերժվում է', async () => {
    const financeItem = await addSubject('finance', 'Խառը Ա', superToken)
    const managementItem = await addSubject('management', 'Խառը Բ', superToken)

    const { status } = await api('POST', '/catalog/delete', {
      token: superToken,
      body: { itemIds: [financeItem, managementItem] },
    })
    assert.equal(status, 400)

    // Ոչ մեկը չպետք է ջնջված լիներ
    assert.ok((await catalogOf('finance')).subjects.some((item: any) => item.name === 'Խառը Ա'))
    assert.ok((await catalogOf('management')).subjects.some((item: any) => item.name === 'Խառը Բ'))
  })

  it('առանց մուտքի, դատարկ ցուցակով և անհայտ id-ով մերժվում է', async () => {
    assert.equal((await api('POST', '/catalog/delete', { body: { itemIds: ['x'] } })).status, 401)
    assert.equal((await api('POST', '/catalog/delete', { token: superToken, body: { itemIds: [] } })).status, 400)
    assert.equal(
      (await api('POST', '/catalog/delete', { token: superToken, body: { itemIds: ['չկա-այդպիսին'] } })).status,
      404,
    )
  })

  it('ջնջում է ֆակուլտետի տվյալ տեսակի բոլոր տարրերը', async () => {
    const before = await catalogOf('economics')
    assert.ok(before.rooms.length > 0, 'Սերմնացված լսարաններ պետք է լինեին')

    const { body } = await api('POST', '/catalog/delete', {
      token: superToken,
      body: { itemIds: before.rooms.map((item: any) => item.id) },
    })

    assert.equal(body.removed, before.rooms.length)
    assert.equal(body.catalog.rooms.length, 0)
    assert.equal(body.catalog.subjects.length, before.subjects.length, 'Առարկաները չպետք է դիպչեին')
  })
})
