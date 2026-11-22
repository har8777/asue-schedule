import type { Lesson, LessonKey, LessonPart } from '../schedule/schedule.types'
import { entriesForHours, partWeight, roundEntries } from './curriculum.constants'
import type { PlanSubject } from './curriculum.types'

/** Համեմատության համար. փոքրատառ, առանց ավելորդ բացատների (սերվերի նման)։ */
const normalize = (value: string): string => value.trim().replace(/\s+/g, ' ').toLocaleLowerCase('hy')

export interface SubjectQuota {
  subject: string
  hours: number
  /** Շաբաթական մուտքերի սահմանաչափը։ */
  limit: number
  /** Այս հոսքում արդեն լրացված մուտքերը (առանց խմբագրվող վանդակի)։ */
  used: number
  /** Խմբագրվող վանդակով ավելացող մուտքերը։ */
  added: number
  isOver: boolean
}

/**
 * Հաշվում է, թե առարկան որքան է լրացված տվյալ հոսքում և արդյոք խմբագրվող
 * վանդակը գերազանցում է ուսումնական պլանի ժամաքանակը։
 */
export const buildSubjectQuotas = (
  planSubjects: PlanSubject[],
  lessons: Lesson[],
  key: LessonKey,
  parts: LessonPart[],
): Map<string, SubjectQuota> => {
  const quotas = new Map<string, SubjectQuota>()
  if (planSubjects.length === 0) return quotas

  const limits = new Map(planSubjects.map((item) => [normalize(item.subject), item]))
  const others = lessons.filter(
    (lesson) => lesson.streamId === key.streamId && !(lesson.day === key.day && lesson.slot === key.slot),
  )

  const used = new Map<string, number>()
  for (const lesson of others) {
    const weight = partWeight(lesson.parts.length)
    for (const part of lesson.parts) {
      if (!part.subject) continue
      const name = normalize(part.subject)
      used.set(name, (used.get(name) ?? 0) + weight)
    }
  }

  const weight = partWeight(parts.length)
  const added = new Map<string, number>()
  for (const part of parts) {
    if (!part.subject) continue
    const name = normalize(part.subject)
    added.set(name, (added.get(name) ?? 0) + weight)
  }

  for (const [name, limit] of limits) {
    const usedEntries = roundEntries(used.get(name) ?? 0)
    const addedEntries = roundEntries(added.get(name) ?? 0)
    const max = entriesForHours(limit.hours)
    quotas.set(name, {
      subject: limit.subject,
      hours: limit.hours,
      limit: max,
      used: usedEntries,
      added: addedEntries,
      isOver: roundEntries(usedEntries + addedEntries) > max + 0.001,
    })
  }
  return quotas
}

/** Առարկայի քվոտան ըստ անվան (նորմալացված համեմատությամբ)։ */
export const findQuota = (quotas: Map<string, SubjectQuota>, subject: string): SubjectQuota | undefined =>
  subject.trim() ? quotas.get(normalize(subject)) : undefined
