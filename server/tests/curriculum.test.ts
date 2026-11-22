import assert from 'node:assert/strict'
import type { AddressInfo } from 'node:net'
import { after, before, describe, it } from 'node:test'
import { createApp } from '../src/app.ts'
import { APP_CONFIG } from '../src/config/app.config.ts'

/**
 * Ուսումնական պլանի թեստեր՝ ժամահաշվարկ, հաստատում և տեսանելիություն։
 */
const SUPER_PASSWORD = 'SuperSecret123'
const ADMIN_PASSWORD = 'AdminPass123'

let baseUrl = ''
let closeApp: () => Promise<void>
let superToken = ''
let financeToken = ''
let cohortId = ''
let streamId = ''

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

const saveLesson = (token: string, body: unknown) => api('PUT', `/cohorts/${cohortId}/lessons`, { token, body })

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
  const cohort = faculties.find((f: any) => f.id === 'finance').cohorts[0]
  cohortId = cohort.id
  streamId = cohort.settings.streams[0].id
})

after(async () => {
  await closeApp()
})

describe('Ուսումնական պլան', () => {
  it('ժամաքանակը կարելի է գրել ձեռքով (ոչ միայն 16-ի պատիկ)', async () => {
    const manual = await api('POST', `/cohorts/${cohortId}/plan/subjects`, {
      token: superToken,
      body: { subject: 'Վիճակագրություն', hours: 20 },
    })
    assert.equal(manual.status, 200)
    assert.equal(manual.body.draft.subjects.find((item: any) => item.subject === 'Վիճակագրություն').hours, 20)

    // Սահմաններից դուրս արժեքները չեն ընդունվում
    assert.equal(
      (await api('POST', `/cohorts/${cohortId}/plan/subjects`, { token: superToken, body: { subject: 'Սխալ', hours: 0 } }))
        .status,
      400,
    )
    assert.equal(
      (await api('POST', `/cohorts/${cohortId}/plan/subjects`, { token: superToken, body: { subject: 'Սխալ', hours: 999 } }))
        .status,
      400,
    )

    // Մաքրում ենք՝ հետագա ստուգումները չխանգարելու համար
    await api('POST', `/cohorts/${cohortId}/plan/subjects/delete`, {
      token: superToken,
      body: { subject: 'Վիճակագրություն' },
    })
  })

  it('չհաստատված պլանը չի երևում ֆակուլտետի ադմինի մոտ', async () => {
    const added = await api('POST', `/cohorts/${cohortId}/plan/subjects`, {
      token: superToken,
      body: { subject: 'Մաթեմատիկա', hours: 32 },
    })
    assert.equal(added.status, 200)
    assert.equal(added.body.draft.subjects.length, 1)
    assert.equal(added.body.published, null)
    assert.equal(added.body.hasPendingChanges, true)

    const asAdmin = await api('GET', `/cohorts/${cohortId}/plan`, { token: financeToken })
    assert.equal(asAdmin.status, 200)
    assert.equal(asAdmin.body.published, null, 'Ադմինը չպետք է տեսնի չհաստատված պլանը')
    assert.equal(asAdmin.body.draft, null, 'Սևագիրը բացվում է միայն գլխավոր ադմինի մոտ')

    const asGuest = await api('GET', `/cohorts/${cohortId}/plan`)
    assert.equal(asGuest.body.published, null)
    assert.equal(asGuest.body.draft, null)
  })

  it('ֆակուլտետի ադմինը չի կարող խմբագրել պլանը', async () => {
    const { status } = await api('POST', `/cohorts/${cohortId}/plan/subjects`, {
      token: financeToken,
      body: { subject: 'Ֆինանսներ', hours: 32 },
    })
    assert.equal(status, 403)
  })

  it('հաստատումից հետո պլանը տեսանելի է բոլորին', async () => {
    const published = await api('POST', `/cohorts/${cohortId}/plan/publish`, { token: superToken })
    assert.equal(published.status, 200)
    assert.equal(published.body.hasPendingChanges, false)

    const asGuest = await api('GET', `/cohorts/${cohortId}/plan`)
    assert.equal(asGuest.body.published.subjects.length, 1)
    assert.equal(asGuest.body.published.subjects[0].hours, 32)
    assert.equal(asGuest.body.usage[0].entries, 1, '32 ժամ = 1 մուտք')
  })

  it('32 ժամ = 1 ամբողջ մուտք, ավելին արգելվում է', async () => {
    const first = await saveLesson(superToken, {
      day: 'monday',
      slot: '1-2',
      streamId,
      parts: [{ subject: 'Մաթեմատիկա', lecturers: ['Դասախոս Ա'], rooms: ['101'] }],
    })
    assert.equal(first.status, 200)

    const second = await saveLesson(superToken, {
      day: 'tuesday',
      slot: '1-2',
      streamId,
      parts: [{ subject: 'Մաթեմատիկա', lecturers: ['Դասախոս Բ'], rooms: ['102'] }],
    })
    assert.equal(second.status, 409, 'Երկրորդ ամբողջ մուտքը պետք է արգելվի')
    assert.match(second.body.message, /Մաթեմատիկա/)
  })

  it('16 ժամ = կես մուտք (համարիչ/հայտարար)', async () => {
    await api('POST', `/cohorts/${cohortId}/plan/subjects`, {
      token: superToken,
      body: { subject: 'Իրավագիտություն', hours: 16 },
    })
    await api('POST', `/cohorts/${cohortId}/plan/publish`, { token: superToken })

    const half = await saveLesson(superToken, {
      day: 'tuesday',
      slot: '3-4',
      streamId,
      parts: [
        { subject: 'Իրավագիտություն', lecturers: ['Դասախոս Գ'], rooms: ['201'] },
        { subject: '', lecturers: [], rooms: [] },
      ],
    })
    assert.equal(half.status, 200, 'Կես մուտքը թույլատրելի է')

    const whole = await saveLesson(superToken, {
      day: 'wednesday',
      slot: '1-2',
      streamId,
      parts: [{ subject: 'Իրավագիտություն', lecturers: ['Դասախոս Դ'], rooms: ['202'] }],
    })
    assert.equal(whole.status, 409, '16 ժամը չի կարող ամբողջ մուտք զբաղեցնել')
  })

  it('48 ժամ = 1,5 մուտք', async () => {
    await api('POST', `/cohorts/${cohortId}/plan/subjects`, {
      token: superToken,
      body: { subject: 'Տնտեսագիտություն', hours: 48 },
    })
    await api('POST', `/cohorts/${cohortId}/plan/publish`, { token: superToken })

    const first = await saveLesson(superToken, {
      day: 'wednesday',
      slot: '3-4',
      streamId,
      parts: [{ subject: 'Տնտեսագիտություն', lecturers: ['Դասախոս Ե'], rooms: ['301'] }],
    })
    assert.equal(first.status, 200)

    const half = await saveLesson(superToken, {
      day: 'thursday',
      slot: '1-2',
      streamId,
      parts: [
        { subject: 'Տնտեսագիտություն', lecturers: ['Դասախոս Զ'], rooms: ['302'] },
        { subject: '', lecturers: [], rooms: [] },
      ],
    })
    assert.equal(half.status, 200, '1 + 0,5 = 1,5 մուտք')

    const extra = await saveLesson(superToken, {
      day: 'friday',
      slot: '1-2',
      streamId,
      parts: [
        { subject: 'Տնտեսագիտություն', lecturers: ['Դասախոս Է'], rooms: ['303'] },
        { subject: '', lecturers: [], rooms: [] },
      ],
    })
    assert.equal(extra.status, 409, '1,5-ից ավելին արգելվում է')
  })

  it('սահմանաչափը առանձին է յուրաքանչյուր հոսքի համար', async () => {
    const cohort = (await api('GET', `/cohorts/${cohortId}`)).body
    const otherStream = cohort.settings.streams[1].id
    const saved = await saveLesson(superToken, {
      day: 'monday',
      slot: '1-2',
      streamId: otherStream,
      parts: [{ subject: 'Մաթեմատիկա', lecturers: ['Դասախոս Ը'], rooms: ['401'] }],
    })
    assert.equal(saved.status, 200, 'Այլ հոսքն ունի իր սեփական ժամաքանակը')
  })

  it('պլանով հաստատված օրերը կիրառվում են կուրսի աղյուսակին', async () => {
    const updated = await api('PATCH', `/cohorts/${cohortId}/plan`, {
      token: superToken,
      body: { days: ['monday', 'tuesday', 'wednesday'] },
    })
    assert.equal(updated.status, 200)
    assert.equal(updated.body.hasPendingChanges, true)

    const beforePublish = (await api('GET', `/cohorts/${cohortId}`)).body
    assert.equal(beforePublish.settings.days.length, 5, 'Մինչև հաստատումը աղյուսակը չի փոխվում')

    const published = await api('POST', `/cohorts/${cohortId}/plan/publish`, { token: superToken })
    assert.equal(published.status, 200)
    const afterPublish = (await api('GET', `/cohorts/${cohortId}`)).body
    assert.deepEqual(afterPublish.settings.days, ['monday', 'tuesday', 'wednesday'])
  })

  it('չհաստատված փոփոխությունները կարելի է չեղարկել', async () => {
    await api('POST', `/cohorts/${cohortId}/plan/subjects`, {
      token: superToken,
      body: { subject: 'Ժամանակավոր', hours: 32 },
    })
    const discarded = await api('POST', `/cohorts/${cohortId}/plan/discard`, { token: superToken })
    assert.equal(discarded.status, 200)
    assert.equal(discarded.body.hasPendingChanges, false)
    assert.ok(!discarded.body.draft.subjects.some((item: any) => item.subject === 'Ժամանակավոր'))
  })
})
