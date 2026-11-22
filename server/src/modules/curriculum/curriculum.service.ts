import type { Database } from '../../core/database/database.ts'
import { badRequest, conflict, notFound } from '../../core/http/http-error.ts'
import { normalizeName, nowIso } from '../../core/utils/id.ts'
import { asRecord, requireArray, requireOneOf, requireString } from '../../core/validation/validators.ts'
import { USER_ROLES } from '../auth/auth.constants.ts'
import type { AuthUser } from '../auth/auth.types.ts'
import type { ChangeLogRepository } from '../change-log/change-log.repository.ts'
import { ALLOWED_DAY_STARTS } from '../cohorts/cohorts.service.ts'
import type { CohortsRepository } from '../cohorts/cohorts.repository.ts'
import type { Cohort } from '../cohorts/cohorts.types.ts'
import type { LessonsRepository } from '../lessons/lessons.repository.ts'
import { getCohortDaySlots } from '../lessons/lessons.validation.ts'
import type { Lesson, LessonPart, SaveLessonInput } from '../lessons/lessons.types.ts'
import {
  DAY_KEYS,
  SLOT_KEYS,
  type DayKey,
  type SlotKey,
  type SlotTime,
} from '../schedule-config/schedule-config.constants.ts'
import {
  entriesForHours,
  HOURS_STEP,
  MAX_PLAN_SUBJECTS,
  MAX_SUBJECT_HOURS,
  MIN_SUBJECT_HOURS,
  partWeight,
  roundEntries,
} from './curriculum.constants.ts'
import { emptyPlanContent, type CurriculumRepository } from './curriculum.repository.ts'
import type { CohortPlan, CohortPlanView, PlanContent, PlanSubject, SubjectUsage } from './curriculum.types.ts'

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/

const isSuperAdmin = (user: AuthUser | null): boolean => user?.role === USER_ROLES.SUPER_ADMIN

const assertSuperAdmin = (user: AuthUser): void => {
  if (!isSuperAdmin(user)) throw badRequest('Ուսումնական պլանը խմբագրում է միայն գլխավոր ադմինիստրատորը')
}

const sameContent = (a: PlanContent, b: PlanContent | null): boolean =>
  b !== null && JSON.stringify(a) === JSON.stringify(b)

/** Կլորացնում է առարկաները՝ կրկնվող անունները միավորելով (վերջինը հաղթում է)։ */
const dedupeSubjects = (subjects: PlanSubject[]): PlanSubject[] => {
  const byKey = new Map<string, PlanSubject>()
  for (const item of subjects) byKey.set(normalizeName(item.subject), item)
  return [...byKey.values()].sort((a, b) => a.subject.localeCompare(b.subject, 'hy'))
}

export class CurriculumService {
  private readonly db: Database
  private readonly plans: CurriculumRepository
  private readonly cohorts: CohortsRepository
  private readonly lessons: LessonsRepository
  private readonly changeLog: ChangeLogRepository

  constructor(
    db: Database,
    plans: CurriculumRepository,
    cohorts: CohortsRepository,
    lessons: LessonsRepository,
    changeLog: ChangeLogRepository,
  ) {
    this.db = db
    this.plans = plans
    this.cohorts = cohorts
    this.lessons = lessons
    this.changeLog = changeLog
  }

  private getCohort(cohortId: string): Cohort {
    const cohort = this.cohorts.findById(cohortId)
    if (!cohort) throw notFound('Կուրսը չի գտնվել')
    return cohort
  }

  /** Պլանը, իսկ եթե դեռ չկա՝ կուրսի ներկա կառուցվածքից կազմված սևագիր։ */
  private getOrCreatePlan(cohort: Cohort): CohortPlan {
    const existing = this.plans.findByCohort(cohort.id)
    if (existing) return existing
    return {
      cohortId: cohort.id,
      draft: {
        ...emptyPlanContent(),
        days: [...cohort.settings.days],
        daySlotStart: { ...cohort.settings.daySlotStart },
        slotTimes: { ...(cohort.settings.slotTimes ?? {}) },
      },
      published: null,
      updatedAt: nowIso(),
      publishedAt: null,
      publishedBy: null,
    }
  }

  /** Գործող (հաստատված) առարկաները։ Չհաստատվածը ոչ մի տեղ չի երևում։ */
  getPublishedSubjects(cohortId: string): PlanSubject[] {
    return this.plans.findByCohort(cohortId)?.published?.subjects ?? []
  }

  getView(cohortId: string, user: AuthUser | null): CohortPlanView {
    const cohort = this.getCohort(cohortId)
    const stored = this.plans.findByCohort(cohort.id)
    const plan = stored ?? this.getOrCreatePlan(cohort)
    const canSeeDraft = isSuperAdmin(user)
    return {
      cohortId: cohort.id,
      published: plan.published,
      draft: canSeeDraft ? plan.draft : null,
      // Դեռ չսկսված պլանը հաստատելու կարիք չունի
      hasPendingChanges: stored !== null && !sameContent(plan.draft, plan.published),
      publishedAt: plan.publishedAt,
      updatedAt: plan.updatedAt,
      usage: this.buildUsage(cohort, plan.published?.subjects ?? []),
    }
  }

  /** Առարկայի օգտագործումը՝ ըստ հոսքերի, հաստատված ժամաքանակի համեմատ։ */
  private buildUsage(cohort: Cohort, subjects: PlanSubject[]): SubjectUsage[] {
    if (subjects.length === 0) return []
    const lessons = this.lessons.findByCohort(cohort.id)
    return subjects.map((item) => ({
      subject: item.subject,
      hours: item.hours,
      entries: entriesForHours(item.hours),
      usedByStream: Object.fromEntries(
        cohort.settings.streams.map((stream) => [
          stream.id,
          roundEntries(countSubjectEntries(lessons, stream.id, item.subject)),
        ]),
      ),
    }))
  }

  updateDraft(user: AuthUser, cohortId: string, input: unknown): CohortPlanView {
    assertSuperAdmin(user)
    const cohort = this.getCohort(cohortId)
    const plan = this.getOrCreatePlan(cohort)
    const body = asRecord(input)
    const draft: PlanContent = {
      subjects: body.subjects === undefined ? plan.draft.subjects : this.parseSubjects(body.subjects),
      days: body.days === undefined ? plan.draft.days : this.parseDays(body.days),
      daySlotStart: body.daySlotStart === undefined ? plan.draft.daySlotStart : this.parseDaySlotStart(body.daySlotStart),
      slotTimes: body.slotTimes === undefined ? plan.draft.slotTimes : this.parseSlotTimes(body.slotTimes),
    }
    this.plans.save({ ...plan, draft, updatedAt: nowIso() })
    return this.getView(cohortId, user)
  }

  /** Ավելացնում է մեկ առարկա սևագրին (կամ թարմացնում ժամաքանակը)։ */
  setSubject(user: AuthUser, cohortId: string, input: unknown): CohortPlanView {
    assertSuperAdmin(user)
    const cohort = this.getCohort(cohortId)
    const plan = this.getOrCreatePlan(cohort)
    const body = asRecord(input)
    const subject = requireString(body.subject, 'Առարկա', { max: 200 })
    const hours = this.parseHours(body.hours)
    const subjects = dedupeSubjects([
      ...plan.draft.subjects.filter((item) => normalizeName(item.subject) !== normalizeName(subject)),
      { subject, hours },
    ])
    this.plans.save({ ...plan, draft: { ...plan.draft, subjects }, updatedAt: nowIso() })
    return this.getView(cohortId, user)
  }

  removeSubject(user: AuthUser, cohortId: string, subject: string): CohortPlanView {
    assertSuperAdmin(user)
    const cohort = this.getCohort(cohortId)
    const plan = this.getOrCreatePlan(cohort)
    const subjects = plan.draft.subjects.filter((item) => normalizeName(item.subject) !== normalizeName(subject))
    this.plans.save({ ...plan, draft: { ...plan.draft, subjects }, updatedAt: nowIso() })
    return this.getView(cohortId, user)
  }

  /**
   * Հաստատում է սևագիրը։ Միայն դրանից հետո պլանը երևում է ֆակուլտետների
   * ադմինների և ուսանողների մոտ, և կուրսի աղյուսակը ստանում է նոր օրերն ու ժամերը։
   */
  publish(user: AuthUser, cohortId: string): CohortPlanView & { removedLessons: number } {
    assertSuperAdmin(user)
    const cohort = this.getCohort(cohortId)
    const plan = this.getOrCreatePlan(cohort)
    if (plan.draft.days.length === 0) throw badRequest('Ընտրեք շաբաթվա առնվազն մեկ օր')

    const removedLessons = this.db.transaction(() => {
      const published: PlanContent = JSON.parse(JSON.stringify(plan.draft)) as PlanContent
      this.plans.save({
        ...plan,
        published,
        updatedAt: nowIso(),
        publishedAt: nowIso(),
        publishedBy: user.id,
      })

      const updated: Cohort = {
        ...cohort,
        settings: {
          ...cohort.settings,
          days: published.days,
          daySlotStart: published.daySlotStart,
          slotTimes: published.slotTimes,
        },
      }
      this.cohorts.update(updated)
      const removed = this.removeLessonsOutsideGrid(updated)

      this.changeLog.insert({
        userId: user.id,
        userName: user.displayName,
        facultyId: cohort.facultyId,
        cohortId: cohort.id,
        cohortName: cohort.name,
        action: 'plan.publish',
        day: '',
        slot: '',
        streamId: '',
        before: null,
        after: null,
      })
      return removed
    })

    return { ...this.getView(cohortId, user), removedLessons }
  }

  /** Չեղարկում է չհաստատված փոփոխությունները՝ վերադառնալով հաստատված տարբերակին։ */
  discardDraft(user: AuthUser, cohortId: string): CohortPlanView {
    assertSuperAdmin(user)
    const cohort = this.getCohort(cohortId)
    const plan = this.getOrCreatePlan(cohort)
    if (!plan.published) throw badRequest('Հաստատված պլան դեռ չկա')
    this.plans.save({ ...plan, draft: JSON.parse(JSON.stringify(plan.published)) as PlanContent, updatedAt: nowIso() })
    return this.getView(cohortId, user)
  }

  /**
   * Ստուգում է ժամաքանակի սահմանաչափը։ Եթե առարկան ունի հաստատված ժամաքանակ,
   * հոսքում այն չի կարող գերազանցել ժամաքանակ/32 շաբաթական մուտքը։
   */
  assertWithinHours(cohort: Cohort, input: SaveLessonInput): void {
    const subjects = this.getPublishedSubjects(cohort.id)
    if (subjects.length === 0) return
    const limits = new Map(subjects.map((item) => [normalizeName(item.subject), item]))

    const others = this.lessons
      .findByCohort(cohort.id)
      .filter((lesson) => !(lesson.day === input.day && lesson.slot === input.slot && lesson.streamId === input.streamId))

    const weight = partWeight(input.parts.length)
    const added = new Map<string, number>()
    for (const part of input.parts) {
      if (!part.subject) continue
      const key = normalizeName(part.subject)
      added.set(key, (added.get(key) ?? 0) + weight)
    }

    for (const [key, addedEntries] of added) {
      const limit = limits.get(key)
      if (!limit) continue
      const used = countSubjectEntries(others, input.streamId, limit.subject)
      const total = roundEntries(used + addedEntries)
      const max = entriesForHours(limit.hours)
      if (total > max + 0.001) {
        throw conflict(
          `«${limit.subject}»՝ ${limit.hours} ժամ (${formatEntries(max)} մուտք)։ Այս հոսքում արդեն լրացված է ${formatEntries(
            roundEntries(used),
          )} մուտք, ավելին հնարավոր չէ նշել։`,
          { subject: limit.subject, hours: limit.hours, maxEntries: max, usedEntries: roundEntries(used) },
        )
      }
    }
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

  private parseHours(value: unknown): number {
    if (typeof value !== 'number' || !Number.isFinite(value)) throw badRequest('«Ժամաքանակ» դաշտը պարտադիր է')
    const hours = Math.round(value)
    if (hours < MIN_SUBJECT_HOURS || hours > MAX_SUBJECT_HOURS) {
      throw badRequest(`Ժամաքանակը պետք է լինի ${MIN_SUBJECT_HOURS}-ից ${MAX_SUBJECT_HOURS} միջակայքում`)
    }
    if (hours % HOURS_STEP !== 0) throw badRequest(`Ժամաքանակը պետք է լինի ${HOURS_STEP}-ի պատիկ (16, 32, 48, 64, 80 …)`)
    return hours
  }

  private parseSubjects(value: unknown): PlanSubject[] {
    const rows = requireArray(value, 'Առարկաներ', { max: MAX_PLAN_SUBJECTS })
    return dedupeSubjects(
      rows.map((raw) => {
        const row = asRecord(raw, 'Առարկան')
        return { subject: requireString(row.subject, 'Առարկա', { max: 200 }), hours: this.parseHours(row.hours) }
      }),
    )
  }

  private parseDays(value: unknown): DayKey[] {
    const daySet = new Set(requireArray(value, 'Օրեր', { min: 1, max: 7 }).map((day) => requireOneOf(day, DAY_KEYS, 'Օր')))
    return DAY_KEYS.filter((day) => daySet.has(day))
  }

  private parseDaySlotStart(value: unknown): Partial<Record<DayKey, SlotKey>> {
    const result: Partial<Record<DayKey, SlotKey>> = {}
    for (const [day, start] of Object.entries(asRecord(value, 'Դասաժամերը'))) {
      const dayKey = requireOneOf(day, DAY_KEYS, 'Օր')
      const slot = requireOneOf(start, ALLOWED_DAY_STARTS, 'Առաջին դասաժամ')
      if (slot !== '1-2') result[dayKey] = slot
    }
    return result
  }

  private parseSlotTimes(value: unknown): Partial<Record<SlotKey, SlotTime>> {
    const result: Partial<Record<SlotKey, SlotTime>> = {}
    for (const [slot, raw] of Object.entries(asRecord(value, 'Ժամերը'))) {
      const slotKey = requireOneOf(slot, SLOT_KEYS, 'Դասաժամ')
      const time = asRecord(raw, 'Ժամը')
      const start = requireString(time.start, 'Սկիզբ', { max: 5 })
      const end = requireString(time.end, 'Ավարտ', { max: 5 })
      if (!TIME_PATTERN.test(start) || !TIME_PATTERN.test(end)) throw badRequest('Ժամը պետք է լինի ԺԺ:ՐՐ ձևաչափով')
      result[slotKey] = { start, end }
    }
    return result
  }
}

/** Քանի՞ շաբաթական մուտք է զբաղեցնում առարկան տվյալ հոսքում։ */
export const countSubjectEntries = (lessons: Lesson[], streamId: string, subject: string): number => {
  const key = normalizeName(subject)
  let total = 0
  for (const lesson of lessons) {
    if (lesson.streamId !== streamId) continue
    const weight = partWeight(lesson.parts.length)
    lesson.parts.forEach((part: LessonPart) => {
      if (part.subject && normalizeName(part.subject) === key) total += weight
    })
  }
  return roundEntries(total)
}

/** 0,5 → «0,5», 2 → «2» (հայերեն ստորակետով)։ */
export const formatEntries = (entries: number): string =>
  Number.isInteger(entries) ? String(entries) : entries.toFixed(1).replace('.', ',')
