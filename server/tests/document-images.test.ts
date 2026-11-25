import assert from 'node:assert/strict'
import type { AddressInfo } from 'node:net'
import { after, before, describe, it } from 'node:test'
import { createApp } from '../src/app.ts'
import { APP_CONFIG } from '../src/config/app.config.ts'

/** Ստորագրությունների, կնիքի և լոգոյի պատկերների ստուգումները։ */
const SUPER_PASSWORD = 'SuperSecret123'
const ADMIN_PASSWORD = 'AdminPass123'

// 1x1 թափանցիկ PNG
const PNG =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='

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

describe('Ստորագրողների տվյալները նմուշից', () => {
  it('անունները լրացված են ըստ պաշտոնական նմուշի', async () => {
    const { body } = await api('GET', '/settings')
    assert.equal(body.approverTitle, 'ՊՐՈՌԵԿՏՈՐ')
    assert.equal(body.approverName, 'Լ. Դանիելյան')
    assert.equal(body.partTimeHeadName, 'Ժ. Ստեփանյան')
  })

  it('ուսումնական բաժնի պետի անունը նախապես լրացված չէ (հաճախակի փոփոխվող պաշտոն)', async () => {
    const { body } = await api('GET', '/settings')
    assert.equal(body.academicHeadName, '')
  })

  it('Կառավարման ֆակուլտետի դեկանը լրացված է', async () => {
    const faculties = (await api('GET', '/faculties')).body
    const management = faculties.find((item: any) => item.id === 'management')
    assert.equal(management.dean, 'Մ. Մովսիսյան')
    assert.equal(management.deanSignature, '')
  })

  it('ստորագրությունները նախնականով անջատված են', async () => {
    const { body } = await api('GET', '/settings')
    assert.equal(body.showSignatures, false, 'Չհաստատված դասացուցակը չպետք է կնիքով դուրս գա')
  })
})

describe('Պատկերների ստուգում', () => {
  it('ընդունում է PNG data URL և պահում', async () => {
    const { status, body } = await api('PUT', '/settings', {
      token: superToken,
      body: { seal: PNG, approverSignature: PNG, logo: PNG, showSignatures: true },
    })
    assert.equal(status, 200)
    assert.equal(body.seal, PNG)
    assert.equal(body.showSignatures, true)
    assert.equal((await api('GET', '/settings')).body.logo, PNG)
  })

  it('դատարկ տողը հանում է պատկերը', async () => {
    const { body } = await api('PUT', '/settings', { token: superToken, body: { logo: '' } })
    assert.equal(body.logo, '')
    assert.equal(body.seal, PNG, 'Մյուս պատկերներին ձեռք չպետք է տար')
  })

  it('SVG-ն մերժվում է', async () => {
    const svg = 'data:image/svg+xml;base64,PHN2Zz48L3N2Zz4='
    const { status } = await api('PUT', '/settings', { token: superToken, body: { seal: svg } })
    assert.equal(status, 400, 'SVG-ն կարող է սկրիպտ պարունակել')
    assert.equal((await api('GET', '/settings')).body.seal, PNG, 'Հին կնիքը պետք է մնար')
  })

  it('ոչ-պատկեր տողը և չափազանց մեծ ֆայլը մերժվում են', async () => {
    assert.equal((await api('PUT', '/settings', { token: superToken, body: { seal: 'https://example.com/a.png' } })).status, 400)
    const huge = `data:image/png;base64,${'A'.repeat(430_000)}`
    assert.equal((await api('PUT', '/settings', { token: superToken, body: { seal: huge } })).status, 400)
  })

  it('կարգավորումները փոխում է միայն գլխավոր ադմինը', async () => {
    assert.equal((await api('PUT', '/settings', { token: financeToken, body: { seal: PNG } })).status, 403)
    assert.equal((await api('PUT', '/settings', { body: { seal: PNG } })).status, 401)
  })

  it('դեկանի ստորագրությունը պահվում է ֆակուլտետի վրա', async () => {
    const { status, body } = await api('PATCH', '/faculties/management', {
      token: superToken,
      body: { deanSignature: PNG },
    })
    assert.equal(status, 200)
    assert.equal(body.deanSignature, PNG)
    assert.equal(body.dean, 'Մ. Մովսիսյան', 'Անունը չպետք է կորչեր')

    const bad = await api('PATCH', '/faculties/management', {
      token: superToken,
      body: { deanSignature: 'data:text/html;base64,PGI+' },
    })
    assert.equal(bad.status, 400)
  })
})
