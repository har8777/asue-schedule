import type { Database } from '../../core/database/database.ts'
import { badRequest, conflict, notFound } from '../../core/http/http-error.ts'
import { createId } from '../../core/utils/id.ts'
import { asRecord, requireArray, requireOneOf, requireString } from '../../core/validation/validators.ts'
import { assertFacultyAccess } from '../auth/auth.guards.ts'
import type { AuthUser } from '../auth/auth.types.ts'
import type { ChangeLogRepository } from '../change-log/change-log.repository.ts'
import type { FacultiesRepository } from '../faculties/faculties.repository.ts'
import type { LessonsRepository } from '../lessons/lessons.repository.ts'
import { getCohortDaySlots } from '../lessons/lessons.validation.ts'
import {
  DAY_KEYS,
  MAX_STREAMS,
  MIN_STREAMS,
  SLOT_KEYS,
  type DayKey,
  type SlotKey,
} from '../schedule-config/schedule-config.constants.ts'
import { createDefaultCohortSettings } from './cohorts.constants.ts'
import type { CohortsRepository } from './cohorts.repository.ts'
import type { Cohort, CohortKind, CohortSettings, CohortStream } from './cohorts.types.ts'

const COHORT_KINDS: CohortKind[] = ['year', 'program']
/** Օրվա առաջին դասաժամը կարող է լինել մինչև 13-14 (ինչպես հին տարբերակում)։ */
export const ALLOWED_DAY_STARTS: SlotKey[] = SLOT_KEYS.slice(0, 7)
const STREAM_ID_PATTERN = /^stream-\d{1,2}$/

export interface UpdateCohortResult {
  cohort: Cohort
  removedLessons: number
}

export class CohortsService {
  private readonly db: Database
  private readonly cohorts: CohortsRepository
  private readonly faculties: FacultiesRepository
  private readonly lessons: LessonsRepository
  private readonly changeLog: ChangeLogRepository

  constructor(
    db: Database,
    cohorts: CohortsRepository,
    faculties: FacultiesRepository,
    lessons: LessonsRepository,
    changeLog: ChangeLogRepository,
  ) {
    this.db = db
    this.cohorts = cohorts
    this.faculties = faculties
    this.lessons = lessons
    this.changeLog = changeLog
  }

  getById(id: string): Cohort {
    const cohort = this.cohorts.findById(id)
    if (!cohort) throw notFound('Կուրսը չի գտնվել')
    return cohort
  }

  create(user: AuthUser, facultyId: string, input: unknown): Cohort {
    assertFacultyAccess(user, facultyId)
    if (!this.faculties.findById(facultyId)) throw notFound('Ֆակուլտետը չի գտնվել')
    const body = asRecord(input)
    const name = requireString(body.name, 'Անվանում', { max: 80 })
    if (this.cohorts.findByName(facultyId, name)) throw conflict(`«${name}» անունով կուրս արդեն կա`)

    const cohort: Cohort = {
      id: createId(),
      facultyId,
      name,
      kind: body.kind === undefined ? 'program' : requireOneOf(body.kind, COHORT_KINDS, 'Տեսակ'),
      sortOrder: this.cohorts.nextSortOrder(facultyId),
      settings: createDefaultCohortSettings(),
    }
    this.cohorts.insert(cohort)
    return cohort
  }

  /**
   * Թարմացնում է անվանումը և/կամ աղյուսակի կառուցվածքը։ Եթե հոսքը, օրը կամ
   * դասաժամը հեռացվում է, համապատասխան դասերը նույնպես ջնջվում են։
   */
  update(user: AuthUser, id: string, input: unknown): UpdateCohortResult {
    const cohort = this.getById(id)
    assertFacultyAccess(user, cohort.facultyId)
    const body = asRecord(input)

    const name = body.name === undefined ? cohort.name : requireString(body.name, 'Անվանում', { max: 80 })
    if (name !== cohort.name && this.cohorts.findByName(cohort.facultyId, name)) {
      throw conflict(`«${name}» անունով կուրս արդեն կա`)
    }
    const settings = body.settings === undefined ? cohort.settings : this.parseSettings(body.settings)
    const updated: Cohort = { ...cohort, name, settings }

    return this.db.transaction(() => {
      this.cohorts.update(updated)
      const removedLessons = this.removeLessonsOutsideGrid(updated)
      if (body.settings !== undefined) {
        this.changeLog.insert({
          userId: user.id,
          userName: user.displayName,
          facultyId: cohort.facultyId,
          cohortId: cohort.id,
          cohortName: updated.name,
          action: 'cohort.settings',
          day: '',
          slot: '',
          streamId: '',
          before: null,
          after: null,
        })
      }
      return { cohort: updated, removedLessons }
    })
  }

  delete(user: AuthUser, id: string): void {
    const cohort = this.getById(id)
    assertFacultyAccess(user, cohort.facultyId)
    this.cohorts.delete(id)
  }

  parseSettings(input: unknown): CohortSettings {
    const body = asRecord(input, 'Կարգավորումները')

    const streams = requireArray(body.streams, 'Հոսքեր', { min: MIN_STREAMS, max: MAX_STREAMS }).map(
      (raw): CohortStream => {
        const stream = asRecord(raw, 'Հոսքը')
        const id = requireString(stream.id, 'Հոսքի id', { max: 20 })
        if (!STREAM_ID_PATTERN.test(id)) throw badRequest('Հոսքի id-ն անվավեր է')
        return { id, name: requireString(stream.name, 'Հոսքի անվանում', { max: 60 }) }
      },
    )
    if (new Set(streams.map((stream) => stream.id)).size !== streams.length) throw badRequest('Հոսքերի id-ները կրկնվում են')

    const daySet = new Set(requireArray(body.days, 'Օրեր', { min: 1, max: 7 }).map((day) => requireOneOf(day, DAY_KEYS, 'Օր')))
    const days = DAY_KEYS.filter((day) => daySet.has(day))

    const daySlotStart: Partial<Record<DayKey, SlotKey>> = {}
    const rawStarts = body.daySlotStart === undefined ? {} : asRecord(body.daySlotStart, 'Դասաժամերը')
    for (const [day, start] of Object.entries(rawStarts)) {
      const dayKey = requireOneOf(day, DAY_KEYS, 'Օր')
      const slot = requireOneOf(start, ALLOWED_DAY_STARTS, 'Առաջին դասաժամ')
      if (slot !== '1-2') daySlotStart[dayKey] = slot
    }

    return { streams, days, daySlotStart }
  }

  private removeLessonsOutsideGrid(cohort: Cohort): number {
    const streamIds = new Set(cohort.settings.streams.map((stream) => stream.id))
    const outside = this.lessons
      .findByCohort(cohort.id)
      .filter(
        (lesson) =>
          !streamIds.has(lesson.streamId) ||
          !cohort.settings.days.includes(lesson.day) ||
          !getCohortDaySlots(cohort, lesson.day).includes(lesson.slot),
      )
    outside.forEach((lesson) => this.lessons.deleteById(lesson.id))
    return outside.length
  }
}
