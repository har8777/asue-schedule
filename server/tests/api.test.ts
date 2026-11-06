import assert from 'node:assert/strict'
import type { AddressInfo } from 'node:net'
import { after, before, describe, it } from 'node:test'
import { APP_CONFIG } from '../src/config/app.config.ts'
import { createApp } from '../src/app.ts'

/**
 * API-ի ինտեգրացիոն թեստեր՝ ժամանակավոր (in-memory) բազայով։
 * Գործարկում՝ npm test
 */
const SUPER_PASSWORD = 'SuperSecret123'
let baseUrl = ''
let closeApp: () => Promise<void>

interface ApiResponse<T = any> {
  status: number
  body: T
}

const api = async <T = any>(method: string, path: string, options: { token?: string; body?: unknown } = {}): Promise<ApiResponse<T>> => {
  const response = await fetch(`${baseUrl}/api/v1${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  })
  const text = await response.text()
  return { status: response.status, body: text ? JSON.parse(text) : undefined }
}

const login = async (username: string, password: string): Promise<string> => {
  const { status, body } = await api('POST', '/auth/login', { body: { username, password } })
  assert.equal(status, 200, `Մուտքը ձախողվեց ${username}-ի համար`)
  return body.token
}

let superToken = ''
let financeToken = ''
let managementToken = ''
let financeCohortId = ''
let managementCohortId = ''

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
  closeApp = () =>
    new Promise((resolve) =>
      server.close(() => {
        db.close()
        resolve()
      }),
    )

  superToken = await login('superadmin', SUPER_PASSWORD)
  for (const [username, facultyId] of [
    ['finance.admin', 'finance'],
    ['management.admin', 'management'],
  ]) {
    const created = await api('POST', '/users', {
      token: superToken,
      body: { username, displayName: username, password: 'AdminPass123', role: 'ADMIN', facultyId },
    })
    assert.equal(created.status, 201)
  }
  financeToken = await login('finance.admin', 'AdminPass123')
  managementToken = await login('management.admin', 'AdminPass123')

  const faculties = (await api('GET', '/faculties')).body
  financeCohortId = faculties.find((f: any) => f.id === 'finance').cohorts[0].id
  managementCohortId = faculties.find((f: any) => f.id === 'management').cohorts[0].id
})

after(async () => {
  await closeApp()
})

describe('Հանրային API', () => {
  it('վերադարձնում է ֆակուլտետները կուրսերով', async () => {
    const { status, body } = await api('GET', '/faculties')
    assert.equal(status, 200)
    assert.equal(body.length, 6)
    const management = body.find((f: any) => f.id === 'management')
    assert.ok(management.cohorts.some((c: any) => c.name === 'Սերվիս'))
    assert.equal(management.cohorts.filter((c: any) => c.kind === 'year').length, 5)
  })

  it('տալիս է կարգավորումները առանց մուտքի', async () => {
    const { status, body } = await api('GET', '/settings')
    assert.equal(status, 200)
    assert.equal(body.slotTimes['1-2'].start, '09:30')
  })
})

describe('Մուտք և դերեր', () => {
  it('մերժում է սխալ գաղտնաբառը', async () => {
    const { status } = await api('POST', '/auth/login', { body: { username: 'superadmin', password: 'wrong' } })
    assert.equal(status, 401)
  })

  it('/auth/me-ն վերադարձնում է օգտատիրոջ դերը և ֆակուլտետը', async () => {
    const { body } = await api('GET', '/auth/me', { token: financeToken })
    assert.equal(body.role, 'ADMIN')
    assert.equal(body.facultyId, 'finance')
  })

  it('առանց մուտքի չի թույլատրում խմբագրել', async () => {
    const { status } = await api('PUT', `/cohorts/${financeCohortId}/lessons`, {
      body: { day: 'monday', slot: '1-2', streamId: 'stream-1', parts: [lesson('Բանկային գործ', [], [])] },
    })
    assert.equal(status, 401)
  })

  it('ադմինը չի կարող խմբագրել այլ ֆակուլտետի դասացուցակը', async () => {
    const { status } = await api('PUT', `/cohorts/${managementCohortId}/lessons`, {
      token: financeToken,
      body: { day: 'monday', slot: '1-2', streamId: 'stream-1', parts: [lesson('Մենեջմենթ', [], [])] },
    })
    assert.equal(status, 403)
  })

  it('ադմինը չի կարող կառավարել օգտատերերին', async () => {
    assert.equal((await api('GET', '/users', { token: financeToken })).status, 403)
  })

  it('չի թույլատրում ջնջել վերջին գլխավոր ադմինին', async () => {
    const users = (await api('GET', '/users', { token: superToken })).body
    const superAdmin = users.find((u: any) => u.role === 'SUPER_ADMIN')
    const { status } = await api('PATCH', `/users/${superAdmin.id}`, { token: superToken, body: { role: 'ADMIN', facultyId: 'it' } })
    assert.equal(status, 400)
  })
})

describe('Դասեր և բախումներ', () => {
  it('ադմինը պահպանում է իր ֆակուլտետի դասը, և այն երևում է հանրային դասացուցակում', async () => {
    const saved = await api('PUT', `/cohorts/${financeCohortId}/lessons`, {
      token: financeToken,
      body: { day: 'monday', slot: '1-2', streamId: 'stream-1', parts: [lesson('Բանկային գործ', ['Սարգսյան Արամ'], ['201'])] },
    })
    assert.equal(saved.status, 200)
    const schedule = (await api('GET', `/cohorts/${financeCohortId}/schedule`)).body
    assert.equal(schedule.lessons.length, 1)
    assert.equal(schedule.lessons[0].parts[0].subject, 'Բանկային գործ')
  })

  it('հայտնաբերում է նույն դասախոսի բախումը այլ ֆակուլտետում (409), իսկ force-ով պահպանում է', async () => {
    const body = { day: 'monday', slot: '1-2', streamId: 'stream-2', parts: [lesson('Մենեջմենթ', ['Սարգսյան Արամ'], ['305'])] }
    const blocked = await api('PUT', `/cohorts/${managementCohortId}/lessons`, { token: managementToken, body })
    assert.equal(blocked.status, 409)
    assert.equal(blocked.body.details.conflicts[0].kind, 'lecturer')

    const forced = await api('PUT', `/cohorts/${managementCohortId}/lessons`, { token: managementToken, body: { ...body, force: true } })
    assert.equal(forced.status, 200)
  })

  it('համարիչն ու հայտարարը չեն բախվում միմյանց հետ', async () => {
    const first = await api('PUT', `/cohorts/${financeCohortId}/lessons`, {
      token: financeToken,
      body: {
        day: 'tuesday',
        slot: '3-4',
        streamId: 'stream-1',
        parts: [lesson('Աուդիտ', ['Ադամյան Մարինե'], ['101']), lesson('Ֆինանսական հաշվառում', ['Աթոյան Վարդան'], ['102'])],
      },
    })
    assert.equal(first.status, 200)
    const check = await api('POST', `/cohorts/${financeCohortId}/lessons/check`, {
      token: financeToken,
      body: {
        day: 'tuesday',
        slot: '3-4',
        streamId: 'stream-2',
        parts: [lesson('Էկոնոմետրիկա', ['Աթոյան Վարդան'], ['103']), lesson('Աուդիտ', ['Ադամյան Մարինե'], ['104'])],
      },
    })
    assert.deepEqual(check.body, [])
  })

  it('ամբողջական դասը բախվում է համարիչի հետ', async () => {
    const check = await api('POST', `/cohorts/${financeCohortId}/lessons/check`, {
      token: financeToken,
      body: { day: 'tuesday', slot: '3-4', streamId: 'stream-3', parts: [lesson('Էկոնոմետրիկա', ['Ադամյան Մարինե'], ['110'])] },
    })
    assert.equal(check.body.length, 1)
  })

  it('նույն վանդակում նույն դասախոսը երկու մասում նշվում է որպես ներքին բախում', async () => {
    const check = await api('POST', `/cohorts/${financeCohortId}/lessons/check`, {
      token: financeToken,
      body: {
        day: 'wednesday',
        slot: '1-2',
        streamId: 'stream-1',
        parts: [lesson('Աուդիտ', ['Գրիգորյան Լիլիթ'], []), lesson('Աուդիտ', ['Գրիգորյան Լիլիթ'], [])],
      },
    })
    assert.equal(check.body.length, 1)
    assert.equal(check.body[0].isInternal, true)
  })

  it('մերժում է աղյուսակից դուրս վանդակը', async () => {
    const { status } = await api('PUT', `/cohorts/${financeCohortId}/lessons`, {
      token: financeToken,
      body: { day: 'saturday', slot: '1-2', streamId: 'stream-1', parts: [lesson('Աուդիտ', [], [])] },
    })
    assert.equal(status, 400)
  })

  it('դատարկ առարկայով պահպանումը ջնջում է դասը', async () => {
    await api('PUT', `/cohorts/${financeCohortId}/lessons`, {
      token: financeToken,
      body: { day: 'friday', slot: '7-8', streamId: 'stream-1', parts: [lesson('Լոգիստիկա', [], [])] },
    })
    await api('PUT', `/cohorts/${financeCohortId}/lessons`, {
      token: financeToken,
      body: { day: 'friday', slot: '7-8', streamId: 'stream-1', parts: [lesson('', [], [])] },
    })
    const schedule = (await api('GET', `/cohorts/${financeCohortId}/schedule`)).body
    assert.ok(!schedule.lessons.some((l: any) => l.day === 'friday'))
  })

  it('նոր դասախոսը ավելանում է տեղեկատուին, իսկ ձեռքով նշված լսարանը՝ ոչ (ժամանակավոր է)', async () => {
    const saved = await api('PUT', `/cohorts/${financeCohortId}/lessons`, {
      token: financeToken,
      body: { day: 'thursday', slot: '5-6', streamId: 'stream-4', parts: [lesson('Նոր առարկա', ['Նոր Դասախոս'], ['999'])] },
    })
    assert.deepEqual(saved.body.lesson.parts[0].rooms, ['999'], 'լսարանը պահվում է դասում')
    const catalog = (await api('GET', '/faculties/finance/catalog')).body
    assert.ok(catalog.lecturers.some((item: any) => item.name === 'Նոր Դասախոս'))
    assert.ok(!catalog.rooms.some((item: any) => item.name === '999'), 'լսարանը չպետք է ավելանա տեղեկատուին')
  })

  it('զբաղված լսարանը արգելվում է նույնիսկ force-ով (ROOM_OCCUPIED)', async () => {
    const { status, body } = await api('PUT', `/cohorts/${financeCohortId}/lessons`, {
      token: financeToken,
      body: { day: 'monday', slot: '1-2', streamId: 'stream-3', parts: [lesson('Աուդիտ', [], ['201'])], force: true },
    })
    assert.equal(status, 409)
    assert.equal(body.code, 'ROOM_OCCUPIED')
  })

  it('ձեռքով նշված զբաղված լսարանը նույնպես արգելվում է', async () => {
    const { status, body } = await api('PUT', `/cohorts/${financeCohortId}/lessons`, {
      token: financeToken,
      body: { day: 'thursday', slot: '5-6', streamId: 'stream-1', parts: [lesson('Աուդիտ', [], ['999'])], force: true },
    })
    assert.equal(status, 409)
    assert.equal(body.code, 'ROOM_OCCUPIED')
  })

  it('տարբեր ֆակուլտետների նույն համարով լսարանները չեն բախվում (առանձին մասնաշենքեր)', async () => {
    const { status, body } = await api('PUT', `/cohorts/${managementCohortId}/lessons`, {
      token: managementToken,
      body: { day: 'monday', slot: '1-2', streamId: 'stream-3', parts: [lesson('Մենեջմենթ', [], ['201'])] },
    })
    assert.equal(status, 200)
    assert.deepEqual(body.conflicts, [])
  })
})

describe('Կուրսի կարգավորումներ', () => {
  it('հոսքը հեռացնելիս ջնջվում են նրա դասերը', async () => {
    const cohort = (await api('GET', `/cohorts/${financeCohortId}`)).body
    const settings = { ...cohort.settings, streams: cohort.settings.streams.slice(0, 3) }
    const { status, body } = await api('PATCH', `/cohorts/${financeCohortId}`, { token: financeToken, body: { settings } })
    assert.equal(status, 200)
    assert.equal(body.removedLessons, 1)
  })

  it('ավելացնում է շաբաթ օրը և փոխում դասաժամերի սկիզբը', async () => {
    const cohort = (await api('GET', `/cohorts/${financeCohortId}`)).body
    const settings = { ...cohort.settings, days: [...cohort.settings.days, 'saturday'], daySlotStart: { saturday: '3-4' } }
    const { body } = await api('PATCH', `/cohorts/${financeCohortId}`, { token: financeToken, body: { settings } })
    assert.ok(body.cohort.settings.days.includes('saturday'))
    assert.equal(body.cohort.settings.daySlotStart.saturday, '3-4')
  })
})

describe('Հաշվետվություններ', () => {
  it('կազմում է դասախոսի անհատական դասացուցակը', async () => {
    const { body } = await api('GET', `/reports/lecturer-schedule?name=${encodeURIComponent('Սարգսյան Արամ')}`)
    assert.equal(body.length, 2)
    assert.equal(body[0].day, 'monday')
  })

  it('ցույց է տալիս զբաղված լսարանները', async () => {
    const { body } = await api('GET', '/reports/free-rooms?facultyId=finance&day=monday&slot=1-2', { token: financeToken })
    const room201 = body.flatMap((floor: any) => floor.rooms).find((room: any) => room.name === '201')
    assert.equal(room201.isFree, false)
  })

  it('համալսարանային բախումների հաշվետվությունը ներառում է ստիպողաբար պահպանված բախումը', async () => {
    const { body } = await api('GET', '/reports/conflicts', { token: superToken })
    assert.ok(body.some((conflict: any) => conflict.name === 'Սարգսյան Արամ'))
  })

  it('որոնումը գտնում է դասերը և տեղեկատուի տարրերը', async () => {
    const { body } = await api('GET', `/reports/search?q=${encodeURIComponent('բանկային')}`, { token: financeToken })
    assert.ok(body.lessons.length >= 1)
    assert.ok(body.catalog.length >= 1)
  })

  it('ադմինը տեսնում է միայն իր ֆակուլտետի փոփոխությունները', async () => {
    const { body } = await api('GET', '/change-log', { token: financeToken })
    assert.ok(body.length > 0)
    assert.ok(body.every((entry: any) => entry.facultyId === 'finance'))
  })
})

describe('Պահուստավորում', () => {
  it('արտահանում և վերականգնում է ամբողջ բազան', async () => {
    const response = await fetch(`${baseUrl}/api/v1/backup`, { headers: { Authorization: `Bearer ${superToken}` } })
    const backup = (await response.json()) as { lessons: unknown[] }
    const lessonsBefore = backup.lessons.length

    await api('DELETE', '/lessons', { token: superToken })
    const restored = await api('POST', '/backup/restore', { token: superToken, body: backup })
    assert.equal(restored.status, 200)
    assert.equal(restored.body.lessons, lessonsBefore)

    const me = await api('GET', '/auth/me', { token: financeToken })
    assert.equal(me.body.facultyId, 'finance', 'ադմինի կապը ֆակուլտետի հետ պետք է պահպանվի')
  })

  it('ներմուծում է հին տարբերակի Backup JSON ֆայլը', async () => {
    const legacy = {
      version: '8.0',
      allSchedules: {
        'Տնտեսագիտական ֆակուլտետ': {
          '2-րդ կուրս': {
            'monday-1-2-stream-5': { course: 'Էկոնոմետրիկա', prof: 'Բարսեղյան Վահե, Ադամյան Մարինե', room: '301' },
            'tuesday-9-10-stream-1': {
              course: { type: 'split', items: ['Մակրո', 'Միկրո'], part1: 'Մակրո', part2: 'Միկրո' },
              prof: { type: 'split', part1: 'Աթոյան Վարդան', part2: '' },
              room: { type: 'split', part1: '201', part2: '202' },
            },
          },
        },
      },
    }
    const { status, body } = await api('POST', '/backup/restore', { token: superToken, body: legacy })
    assert.equal(status, 200)
    assert.equal(body.lessons, 2)

    const economics = (await api('GET', '/faculties/economics')).body
    const cohort = economics.cohorts.find((c: any) => c.name === '2-րդ կուրս')
    assert.equal(cohort.settings.streams.length, 5)
    assert.equal(cohort.settings.daySlotStart.tuesday, undefined)
    const schedule = (await api('GET', `/cohorts/${cohort.id}/schedule`)).body
    const split = schedule.lessons.find((l: any) => l.day === 'tuesday')
    assert.equal(split.parts.length, 2)
    assert.deepEqual(split.parts[0].lecturers, ['Աթոյան Վարդան'])
    const whole = schedule.lessons.find((l: any) => l.day === 'monday')
    assert.deepEqual(whole.parts[0].lecturers, ['Բարսեղյան Վահե', 'Ադամյան Մարինե'])
  })
})
