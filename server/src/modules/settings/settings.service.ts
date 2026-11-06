import { badRequest } from '../../core/http/http-error.ts'
import { asRecord, requireString } from '../../core/validation/validators.ts'
import { DEFAULT_SLOT_TIMES, SLOT_KEYS, type SlotKey, type SlotTime } from '../schedule-config/schedule-config.constants.ts'
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
      slotTimes: body.slotTimes === undefined ? current.slotTimes : this.readSlotTimes(body.slotTimes),
    }
    this.repository.set(PUBLIC_SETTINGS_KEY, next)
    return next
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
