import type { PublicSettings } from '../settings/settings.types'
import { DAY_KEYS, type DayKey, type SlotKey } from './schedule.constants'
import type { Cohort, CohortStream, Lesson, LessonPart } from './schedule.types'
import { getDaySlots, lessonKeyId } from './schedule.utils'

/**
 * Պաշտոնական դասացուցակի կառուցվածքը (ՀՊՏՀ-ի ձևաչափ)։
 *
 * Տողերը՝ շաբաթվա օրեր և դրանց դասաժամերը, սյունակները՝ հոսքերը, որոնցից
 * յուրաքանչյուրն ունի «Ժամ / Առարկա / Դասախոսներ / Լսարան» ենթասյունակները։
 * Բաժանված դասաժամը (համարիչ/հայտարար) գրվում է նույն վանդակում՝ երկու
 * ենթատողով, առանց առանձին մակագրության, ինչպես թղթային տարբերակում է։
 */

/** Մեկ ենթատող՝ մեկ հոսքի համար։ */
export interface OfficialSlotCell {
  /** Մասը, կամ null՝ եթե այս հոսքում այդ ենթատողը դատարկ է։ */
  part: LessonPart | null
  /** Քանի՞ ենթատող է զբաղեցնում (համարիչ/հայտարար չունեցող դասը՝ բոլորը)։ */
  rowSpan: number
}

export interface OfficialSlotRow {
  slot: SlotKey
  /** Ենթատողի համարը դասաժամի ներսում (0-ից)։ */
  partIndex: number
  /** Դասաժամի ենթատողերի ընդհանուր քանակը (rowSpan-ի համար)։ */
  partCount: number
  /** Ըստ հոսքերի՝ տվյալ ենթատողի բովանդակությունը։ */
  cells: (OfficialSlotCell | null)[]
}

export interface OfficialDayBlock {
  day: DayKey
  rows: OfficialSlotRow[]
}

/**
 * Օրվա դասաժամերը. եթե որևէ հոսքում դասաժամը բաժանված է, տողը բաժանվում է
 * բոլոր հոսքերի համար, իսկ չբաժանված հոսքերի վանդակները ձգվում են ներքև։
 */
const buildDay = (
  day: DayKey,
  cohort: Cohort,
  streams: CohortStream[],
  lessons: Map<string, Lesson>,
): OfficialDayBlock => {
  const rows: OfficialSlotRow[] = []

  for (const slot of getDaySlots(cohort.settings, day)) {
    const perStream = streams.map((stream) => lessons.get(lessonKeyId({ day, slot, streamId: stream.id })))
    const partCount = Math.max(1, ...perStream.map((lesson) => lesson?.parts.length ?? 1))

    for (let partIndex = 0; partIndex < partCount; partIndex += 1) {
      rows.push({
        slot,
        partIndex,
        partCount,
        cells: perStream.map((lesson) => {
          const parts = lesson?.parts ?? []
          // Չբաժանված դասը գրավում է դասաժամի բոլոր ենթատողերը
          if (parts.length <= 1) {
            return partIndex === 0 ? { part: parts[0] ?? null, rowSpan: partCount } : null
          }
          return partIndex < parts.length ? { part: parts[partIndex] ?? null, rowSpan: 1 } : null
        }),
      })
    }
  }
  return { day, rows }
}

export const buildOfficialSheet = (cohort: Cohort, lessons: Map<string, Lesson>): OfficialDayBlock[] =>
  DAY_KEYS.filter((day) => cohort.settings.days.includes(day)).map((day) =>
    buildDay(day, cohort, cohort.settings.streams, lessons),
  )

/**
 * Ուսումնական տարին։ Եթե ձեռքով նշված չէ, հաշվվում է կիսամյակի սկզբից
 * (օգոստոսից հետո սկսվող կիսամյակը պատկանում է «YYYY-YYYY+1» տարվան)։
 */
export const resolveAcademicYear = (settings: PublicSettings): string => {
  if (settings.academicYear) return settings.academicYear
  if (!settings.semesterStartDate) return ''
  const date = new Date(`${settings.semesterStartDate}T00:00:00`)
  const year = date.getMonth() >= 7 ? date.getFullYear() : date.getFullYear() - 1
  return `${year}-${year + 1}`
}

interface DocumentSubtitleOptions {
  facultyName: string
  settings: PublicSettings
  cohort: Cohort
  /** Հոսքի անունը՝ միայն այն փաստաթղթերում, որոնք մեկ հոսքի համար են։ */
  streamName?: string
}

/**
 * Փաստաթղթի ենթավերնագիրը՝ ճիշտ ինչպես պաշտոնական թղթային նմուշում.
 *
 *   «Կառավարման ֆակուլտետի 2026/2027 ուս. տարվա 1-ին կիսամյակ հեռակա
 *    բակալավրիատի Կառավարում (ըստ ոլորտի) 1-ին կուրս 1-ին հոսք»
 *
 * Մեկ տեղում է, որպեսզի էկրանը, PDF-ը և Excel-ը երբեք իրարից չշեղվեն։
 */
export const buildDocumentSubtitle = ({
  facultyName,
  settings,
  cohort,
  streamName,
}: DocumentSubtitleOptions): string => {
  const academicYear = resolveAcademicYear(settings).replace('-', '/')
  const studyForm = cohort.studyForm === 'part_time' ? 'հեռակա' : 'առկա'
  return [
    `${facultyName}ի`,
    academicYear && `${academicYear} ուս. տարվա`,
    settings.semesterLabel,
    `${studyForm} բակալավրիատի`,
    cohort.settings.programName,
    cohort.name,
    streamName,
  ]
    .filter(Boolean)
    .join(' ')
}
