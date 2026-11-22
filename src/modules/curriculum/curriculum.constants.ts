/**
 * Ժամահաշվարկ (առկա բակալավրիատ)։ Կիսամյակը 16 շաբաթ է, մեկ մուտքը՝ 2 լսարանային ժամ,
 * հետևաբար շաբաթական մուտքերի քանակը = ժամաքանակ / 2 / 16 = ժամաքանակ / 32։
 */
export const WEEKS_PER_SEMESTER = 16
export const HOURS_PER_ENTRY = 2
export const HOURS_PER_WEEKLY_ENTRY = HOURS_PER_ENTRY * WEEKS_PER_SEMESTER
export const HOURS_STEP = HOURS_PER_WEEKLY_ENTRY / 2
export const MIN_SUBJECT_HOURS = 1
export const MAX_SUBJECT_HOURS = 320

/** Առաջարկվող ժամաքանակները՝ 16, 32, 48 … 160։ */
export const SUGGESTED_HOURS: number[] = Array.from({ length: 10 }, (_, index) => (index + 1) * HOURS_STEP)

export const entriesForHours = (hours: number): number => hours / HOURS_PER_WEEKLY_ENTRY

/** Մեկ մասի կշիռը մուտքերով. ամբողջ դաս → 1, համարիչ/հայտարար → 0,5։ */
export const partWeight = (partsCount: number): number => (partsCount > 0 ? 1 / partsCount : 0)

export const roundEntries = (value: number): number => Math.round(value * 1000) / 1000

/** 0,5 → «0,5», 2 → «2»։ */
export const formatEntries = (entries: number): string =>
  Number.isInteger(entries) ? String(entries) : entries.toFixed(1).replace('.', ',')

/**
 * Բացատրություն ժամաքանակի կողքին, օր.՝ «1,5 մուտք — 1 ամբողջ մուտք + կես մուտք»։
 * Ոչ ստանդարտ (16-ի պատիկ չհանդիսացող) ժամաքանակի դեպքում բաժանումը չի ցուցադրվում։
 */
export const describeHours = (hours: number): string => {
  const entries = entriesForHours(hours)
  const label = `${formatEntries(entries)} մուտք`
  if (hours % HOURS_STEP !== 0) return `${label} (ձեռքով նշված ժամաքանակ)`

  const whole = Math.floor(entries)
  const parts: string[] = []
  if (whole > 0) parts.push(`${whole} ամբողջ մուտք`)
  if (entries - whole >= 0.5) parts.push('կես մուտք (համարիչ/հայտարար)')
  return `${label}${parts.length > 0 ? ` — ${parts.join(' + ')}` : ''}`
}
