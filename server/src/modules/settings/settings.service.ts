import { badRequest } from '../../core/http/http-error.ts'
import { asRecord, requireString } from '../../core/validation/validators.ts'
import { DEFAULT_SLOT_TIMES, SLOT_KEYS, type SlotKey, type SlotTime } from '../schedule-config/schedule-config.constants.ts'
import { readImageField } from './settings.images.ts'
import type { SettingsRepository } from './settings.repository.ts'
import type { PublicSettings } from './settings.types.ts'

const PUBLIC_SETTINGS_KEY = 'public_settings'
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

export const DEFAULT_PUBLIC_SETTINGS: PublicSettings = {
  universityName: 'ՀՊՏՀ',
  semesterLabel: '1-ին կիսամյակ',
  semesterStartDate: null,
  weeksCount: 16,
  academicYear: '',
  approverTitle: 'ՊՐՈՌԵԿՏՈՐ',
  approverName: 'Լ. Դանիելյան',
  approvalDate: '',
  academicHeadLabel: 'Ուսումնական բաժնի պետ',
  academicHeadName: '',
  partTimeHeadLabel: 'Ակադեմիական կազմի սպասարկման բաժնի պետ',
  partTimeHeadName: 'Ժ. Ստեփանյան',
  logo: '',
  approverSignature: '',
  academicHeadSignature: '',
  partTimeHeadSignature: '',
  seal: '',
  showSignatures: false,
  slotTimes: DEFAULT_SLOT_TIMES,
}

export class SettingsService {
  private readonly repository: SettingsRepository

  constructor(repository: SettingsRepository) {
    this.repository = repository
  }

  getPublic(): PublicSettings {
    const stored = this.repository.get<Partial<PublicSettings>>(PUBLIC_SETTINGS_KEY) ?? {}
    return {
      ...DEFAULT_PUBLIC_SETTINGS,
      ...stored,
      slotTimes: { ...DEFAULT_SLOT_TIMES, ...(stored.slotTimes ?? {}) },
    }
  }

  updatePublic(input: unknown): PublicSettings {
    const body = asRecord(input)
    const current = this.getPublic()
    const next: PublicSettings = {
      universityName:
        body.universityName === undefined ? current.universityName : requireString(body.universityName, 'Համալսարան', { max: 100 }),
      semesterLabel:
        body.semesterLabel === undefined ? current.semesterLabel : requireString(body.semesterLabel, 'Կիսամյակ', { max: 60 }),
      semesterStartDate: body.semesterStartDate === undefined ? current.semesterStartDate : this.readDate(body.semesterStartDate),
      weeksCount: body.weeksCount === undefined ? current.weeksCount : this.readWeeks(body.weeksCount),
      academicYear: this.readText(body.academicYear, current.academicYear, 'Ուսումնական տարի', 20),
      approverTitle: this.readText(body.approverTitle, current.approverTitle, 'Հաստատողի պաշտոնը', 60),
      approverName: this.readText(body.approverName, current.approverName, 'Հաստատողի անունը', 80),
      approvalDate: this.readText(body.approvalDate, current.approvalDate, 'Հաստատման ամսաթիվը', 40),
      academicHeadLabel: this.readText(body.academicHeadLabel, current.academicHeadLabel, 'Ուսումնական բաժնի պաշտոնը', 60),
      academicHeadName: this.readText(body.academicHeadName, current.academicHeadName, 'Ուսումնական բաժնի պետը', 80),
      partTimeHeadLabel: this.readText(body.partTimeHeadLabel, current.partTimeHeadLabel, 'Հեռակայի բաժնի պաշտոնը', 80),
      partTimeHeadName: this.readText(body.partTimeHeadName, current.partTimeHeadName, 'Հեռակայի բաժնի պետը', 80),
      logo: this.readImage(body.logo, current.logo, 'Լոգոն'),
      approverSignature: this.readImage(body.approverSignature, current.approverSignature, 'Հաստատողի ստորագրությունը'),
      academicHeadSignature: this.readImage(
        body.academicHeadSignature,
        current.academicHeadSignature,
        'Ուսումնական բաժնի պետի ստորագրությունը',
      ),
      partTimeHeadSignature: this.readImage(
        body.partTimeHeadSignature,
        current.partTimeHeadSignature,
        'Ակադեմիական կազմի բաժնի պետի ստորագրությունը',
      ),
      seal: this.readImage(body.seal, current.seal, 'Կնիքը'),
      showSignatures:
        body.showSignatures === undefined ? current.showSignatures : this.readFlag(body.showSignatures, 'Ստորագրությունների ցուցադրումը'),
      slotTimes: body.slotTimes === undefined ? current.slotTimes : this.readSlotTimes(body.slotTimes),
    }
    this.repository.set(PUBLIC_SETTINGS_KEY, next)
    return next
  }

  /** Ոչ պարտադիր տեքստային դաշտ. դատարկը թույլատրելի է։ */
  private readText(value: unknown, current: string, label: string, max: number): string {
    if (value === undefined) return current
    if (value === null || value === '') return ''
    return requireString(value, label, { max })
  }

  /** Պատկերի դաշտ. undefined՝ չփոխել, դատարկ՝ հանել։ Ստուգումը՝ readImageField-ում։ */
  private readImage(value: unknown, current: string, label: string): string {
    if (value === undefined) return current
    return readImageField(value, label)
  }

  private readFlag(value: unknown, label: string): boolean {
    if (typeof value !== 'boolean') throw badRequest(`${label} պետք է լինի այո/ոչ`)
    return value
  }

  private readDate(value: unknown): string | null {
    if (value === null || value === '') return null
    if (typeof value !== 'string' || !DATE_PATTERN.test(value)) throw badRequest('Կիսամյակի սկիզբը պետք է լինի ամսաթիվ')
    return value
  }

  private readWeeks(value: unknown): number {
    if (typeof value !== 'number' || !Number.isInteger(value) || value < 1 || value > 30) {
      throw badRequest('Շաբաթների քանակը պետք է լինի 1-ից 30')
    }
    return value
  }

  private readSlotTimes(value: unknown): Record<SlotKey, SlotTime> {
    const record = asRecord(value, 'Դասաժամերը')
    const result = { ...DEFAULT_SLOT_TIMES }
    for (const slot of SLOT_KEYS) {
      const entry = record[slot]
      if (entry === undefined) continue
      const { start, end } = asRecord(entry, `${slot} դասաժամը`)
      if (typeof start !== 'string' || typeof end !== 'string' || !TIME_PATTERN.test(start) || !TIME_PATTERN.test(end)) {
        throw badRequest(`${slot} դասաժամի ժամերը պետք է լինեն ՀՀ:ՐՐ ձևաչափով`)
      }
      if (start >= end) throw badRequest(`${slot} դասաժամի ավարտը պետք է լինի սկզբից հետո`)
      result[slot] = { start, end }
    }
    return result
  }
}
