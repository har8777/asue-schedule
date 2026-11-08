import type { Database } from '../../core/database/database.ts'
import { conflict, notFound } from '../../core/http/http-error.ts'
import { normalizeName } from '../../core/utils/id.ts'
import { createId, nowIso } from '../../core/utils/id.ts'
import { assertFacultyAccess } from '../auth/auth.guards.ts'
import type { AuthUser } from '../auth/auth.types.ts'
import type { CatalogService } from '../catalog/catalog.service.ts'
import type { ChangeLogRepository } from '../change-log/change-log.repository.ts'
import type { CohortsRepository } from '../cohorts/cohorts.repository.ts'
import type { Cohort } from '../cohorts/cohorts.types.ts'
import type { FacultiesRepository } from '../faculties/faculties.repository.ts'
import type { Faculty } from '../faculties/faculties.types.ts'
import { detectConflictsFor } from './conflict-detector.ts'
import type { LessonsRepository } from './lessons.repository.ts'
import type {
  Lesson,
  LessonKey,
  LessonLocation,
  LessonWithContext,
  SaveLessonInput,
  ScheduleConflict,
  SlotOccupancy,
} from './lessons.types.ts'
import { isEmptyLesson } from './lessons.validation.ts'

export interface CohortSchedule {
  faculty: Faculty
  cohort: Cohort
  lessons: Lesson[]
}

export interface SaveLessonResult {
  lesson: Lesson | null
  conflicts: ScheduleConflict[]
}

export class LessonsService {
  private readonly db: Database
  private readonly lessons: LessonsRepository
  private readonly cohorts: CohortsRepository
  private readonly faculties: FacultiesRepository
  private readonly catalog: CatalogService
  private readonly changeLog: ChangeLogRepository

  constructor(
    db: Database,
    lessons: LessonsRepository,
    cohorts: CohortsRepository,
    faculties: FacultiesRepository,
    catalog: CatalogService,
    changeLog: ChangeLogRepository,
  ) {
    this.db = db
    this.lessons = lessons
    this.cohorts = cohorts
    this.faculties = faculties
    this.catalog = catalog
    this.changeLog = changeLog
  }

  getCohortContext(cohortId: string): { cohort: Cohort; faculty: Faculty } {
    const cohort = this.cohorts.findById(cohortId)
    if (!cohort) throw notFound('Կուրսը չի գտնվել')
    const faculty = this.faculties.findById(cohort.facultyId)
    if (!faculty) throw notFound('Ֆակուլտետը չի գտնվել')
    return { cohort, faculty }
  }

  getSchedule(cohortId: string): CohortSchedule {
    const { cohort, faculty } = this.getCohortContext(cohortId)
    return { faculty, cohort, lessons: this.lessons.findByCohort(cohortId) }
  }

  /**
   * Տվյալ ժամին զբաղված դասախոսները (ամբողջ համալսարանում) և լսարանները (նույն մասնաշենքում)՝
   * բացառությամբ խմբագրվող վանդակի։ Խմբագրիչը դրանք ցույց է տալիս որպես ոչ ակտիվ։
   */
  getOccupancy(key: LessonKey): SlotOccupancy {
    const { faculty } = this.getCohortContext(key.cohortId)
    const building = normalizeName(faculty.building)
    const others = this.lessons
      .findWithContext({ day: key.day, slot: key.slot })
      .filter((lesson) => !(lesson.cohortId === key.cohortId && lesson.streamId === key.streamId))

    const occupancy: SlotOccupancy = { lecturers: [], rooms: [] }
    for (const lesson of others) {
      lesson.parts.forEach((part, partIndex) => {
        const location: LessonLocation = {
          facultyId: lesson.facultyId,
          facultyName: lesson.facultyName,
          cohortId: lesson.cohortId,
          cohortName: lesson.cohortName,
          streamId: lesson.streamId,
          streamName: lesson.streamName,
          partIndex,
          partsCount: lesson.parts.length,
        }
        const base = { partIndex, partsCount: lesson.parts.length, location }
        part.lecturers.forEach((name) => occupancy.lecturers.push({ ...base, name }))
        if (normalizeName(lesson.building) === building) {
          part.rooms.forEach((name) => occupancy.rooms.push({ ...base, name }))
        }
      })
    }
    return occupancy
  }

  checkConflicts(input: SaveLessonInput): ScheduleConflict[] {
    if (isEmptyLesson(input.parts)) return []
    const { cohort, faculty } = this.getCohortContext(input.cohortId)
    const target: LessonWithContext = {
      ...input,
      id: 'candidate',
      updatedAt: nowIso(),
      updatedBy: null,
      facultyId: faculty.id,
      facultyName: faculty.name,
      facultyShortName: faculty.shortName,
      building: faculty.building,
      cohortName: cohort.name,
      streamName: cohort.settings.streams.find((stream) => stream.id === input.streamId)?.name ?? input.streamId,
    }
    return detectConflictsFor(target, this.lessons.findWithContext({ day: input.day, slot: input.slot }))
  }

  /**
   * Պահպանում է դասը։ Ցանկացած բախման դեպքում (դասախոսը կամ լսարանը նույն ժամին
   * այլ տեղում, կամ կրկնություն նույն վանդակի մասերում) վերադարձնում է 409, և
   * շրջանցելու հնարավորություն չկա։
   */
  save(user: AuthUser, input: SaveLessonInput): SaveLessonResult {
    const { cohort, faculty } = this.getCohortContext(input.cohortId)
    assertFacultyAccess(user, faculty.id)

    if (isEmptyLesson(input.parts)) {
      this.remove(user, input)
      return { lesson: null, conflicts: [] }
    }

    const conflicts = this.checkConflicts(input)
    if (conflicts.length > 0) {
      throw conflict('Դասախոսը կամ լսարանը այդ ժամին արդեն զբաղված է։ Ընտրեք այլ տարբերակ։', { conflicts })
    }

    return this.db.transaction(() => {
      const existing = this.lessons.findOne(input)
      const lesson: Lesson = {
        id: existing?.id ?? createId(),
        cohortId: input.cohortId,
        day: input.day,
        slot: input.slot,
        streamId: input.streamId,
        parts: input.parts,
        updatedAt: nowIso(),
        updatedBy: user.id,
      }
      this.lessons.upsert(lesson)
      this.catalog.learnFromParts(faculty.id, input.parts)
      this.changeLog.insert({
        userId: user.id,
        userName: user.displayName,
        facultyId: faculty.id,
        cohortId: cohort.id,
        cohortName: cohort.name,
        action: 'lesson.save',
        day: input.day,
        slot: input.slot,
        streamId: input.streamId,
        before: existing?.parts ?? null,
        after: input.parts,
      })
      return { lesson, conflicts }
    })
  }

  remove(user: AuthUser, key: LessonKey): void {
    const { cohort, faculty } = this.getCohortContext(key.cohortId)
    assertFacultyAccess(user, faculty.id)
    const existing = this.lessons.findOne(key)
    if (!existing) return

    this.db.transaction(() => {
      this.lessons.delete(key)
      this.changeLog.insert({
        userId: user.id,
        userName: user.displayName,
        facultyId: faculty.id,
        cohortId: cohort.id,
        cohortName: cohort.name,
        action: 'lesson.delete',
        day: key.day,
        slot: key.slot,
        streamId: key.streamId,
        before: existing.parts,
        after: null,
      })
    })
  }

  clearCohort(user: AuthUser, cohortId: string): { deleted: number } {
    const { cohort, faculty } = this.getCohortContext(cohortId)
    assertFacultyAccess(user, faculty.id)
    return this.db.transaction(() => {
      const deleted = this.lessons.deleteByCohort(cohortId)
      this.changeLog.insert({
        userId: user.id,
        userName: user.displayName,
        facultyId: faculty.id,
        cohortId,
        cohortName: cohort.name,
        action: 'cohort.clear',
        day: '',
        slot: '',
        streamId: '',
        before: null,
        after: null,
      })
      return { deleted }
    })
  }
}
