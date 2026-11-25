import type { SlotKey, SlotTime } from '../schedule-config/schedule-config.constants.ts'

/** Համալսարանի ընդհանուր կարգավորումներ, որոնք տեսանելի են բոլորին։ */
export interface PublicSettings {
  universityName: string
  semesterLabel: string
  /** Կիսամյակի առաջին երկուշաբթին (YYYY-MM-DD)՝ օրացույցի (.ics) արտահանման համար։ */
  semesterStartDate: string | null
  weeksCount: number
  /** Ուսումնական տարին, օր.՝ «2026-2027»։ Դատարկի դեպքում հաշվվում է կիսամյակի սկզբից։ */
  academicYear: string
  /** Պաշտոնական ձևի վերնագրի մակագրությունները և ստորագրությունները։ */
  approverTitle: string
  approverName: string
  approvalDate: string
  academicHeadLabel: string
  academicHeadName: string
  /** Հեռակա ուսուցման դասացուցակի ստորագրության տողը։ */
  partTimeHeadLabel: string
  partTimeHeadName: string
  /**
   * Ստորագրությունների և կնիքի պատկերները՝ data URL (png/jpeg/webp, SVG՝ ոչ)։
   * Դատարկ տողը նշանակում է, որ պատկեր դրված չէ։
   */
  logo: string
  approverSignature: string
  academicHeadSignature: string
  partTimeHeadSignature: string
  seal: string
  /**
   * Ցուցադրե՞լ ստորագրություններն ու կնիքը փաստաթղթում։ Նախնականը **ոչ** է,
   * որպեսզի դեռ չհաստատված դասացուցակը պատահաբար կնիքով դուրս չգա։
   */
  showSignatures: boolean
  slotTimes: Record<SlotKey, SlotTime>
}
