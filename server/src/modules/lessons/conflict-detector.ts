import { normalizeName } from '../../core/utils/id.ts'
import type { ConflictKind, LessonLocation, LessonWithContext, ScheduleConflict } from './lessons.types.ts'

interface Usage {
  kind: ConflictKind
  key: string
  displayName: string
  lessonId: string
  partIndex: number
  partsCount: number
  location: LessonLocation
}

/**
 * Երկու մաս զբաղեցնում են նույն ժամանակը, եթե դրանցից մեկը ամբողջական դաս է
 * (մեկ մաս), կամ երկուսն էլ նույն հերթական մասն են (օր.՝ երկուսն էլ «Համարիչ»)։
 */
const partsOverlap = (a: Usage, b: Usage): boolean =>
  a.partsCount === 1 || b.partsCount === 1 || a.partIndex === b.partIndex

const toLocation = (lesson: LessonWithContext, partIndex: number): LessonLocation => ({
  facultyId: lesson.facultyId,
  facultyName: lesson.facultyName,
  cohortId: lesson.cohortId,
  cohortName: lesson.cohortName,
  streamId: lesson.streamId,
  streamName: lesson.streamName,
  partIndex,
  partsCount: lesson.parts.length,
})

const collectUsages = (lessons: LessonWithContext[]): Usage[] =>
  lessons.flatMap((lesson) =>
    lesson.parts.flatMap((part, partIndex) => {
      const base = { lessonId: lesson.id, partIndex, partsCount: lesson.parts.length, location: toLocation(lesson, partIndex) }
      return [
        ...part.lecturers.map((name) => ({ ...base, kind: 'lecturer' as const, key: normalizeName(name), displayName: name })),
        ...part.rooms.map((name) => ({
          ...base,
          kind: 'room' as const,
          // Լսարանը բախվում է միայն նույն մասնաշենքի ներսում
          key: `${normalizeName(lesson.building)}|${normalizeName(name)}`,
          displayName: name,
        })),
      ]
    }),
  )

/** Գտնում է բախումները նույն օրվա և դասաժամի դասերի միջև։ */
const detectInGroup = (lessons: LessonWithContext[]): ScheduleConflict[] => {
  if (lessons.length === 0) return []
  const { day, slot } = lessons[0]
  const byKey = new Map<string, Usage[]>()
  for (const usage of collectUsages(lessons)) {
    const groupKey = `${usage.kind}:${usage.key}`
    byKey.set(groupKey, [...(byKey.get(groupKey) ?? []), usage])
  }

  const conflicts: ScheduleConflict[] = []
  for (const usages of byKey.values()) {
    if (usages.length < 2) continue
    const external = new Set<Usage>()
    const internalByLesson = new Map<string, Set<Usage>>()

    usages.forEach((a, i) => {
      usages.slice(i + 1).forEach((b) => {
        if (a.lessonId !== b.lessonId) {
          if (partsOverlap(a, b)) {
            external.add(a)
            external.add(b)
          }
          return
        }
        if (a.partIndex !== b.partIndex) {
          const set = internalByLesson.get(a.lessonId) ?? new Set<Usage>()
          set.add(a)
          set.add(b)
          internalByLesson.set(a.lessonId, set)
        }
      })
    })

    const { kind, displayName } = usages[0]
    if (external.size > 0) {
      conflicts.push({ kind, name: displayName, day, slot, isInternal: false, locations: [...external].map((u) => u.location) })
    }
    for (const set of internalByLesson.values()) {
      conflicts.push({ kind, name: displayName, day, slot, isInternal: true, locations: [...set].map((u) => u.location) })
    }
  }
  return conflicts
}

/** Ամբողջ համալսարանի բախումների հաշվետվություն։ */
export const detectAllConflicts = (lessons: LessonWithContext[]): ScheduleConflict[] => {
  const groups = new Map<string, LessonWithContext[]>()
  for (const lesson of lessons) {
    const key = `${lesson.day}|${lesson.slot}`
    groups.set(key, [...(groups.get(key) ?? []), lesson])
  }
  return [...groups.values()].flatMap(detectInGroup)
}

/** Ստուգում է մեկ դասը նույն ժամի մյուս դասերի հետ և վերադարձնում միայն դրան վերաբերող բախումները։ */
export const detectConflictsFor = (target: LessonWithContext, sameTimeLessons: LessonWithContext[]): ScheduleConflict[] => {
  const others = sameTimeLessons.filter(
    (lesson) => !(lesson.cohortId === target.cohortId && lesson.streamId === target.streamId),
  )
  return detectInGroup([target, ...others]).filter((conflict) =>
    conflict.locations.some((location) => location.cohortId === target.cohortId && location.streamId === target.streamId),
  )
}
