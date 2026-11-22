/**
 * Ժամահաշվարկ (առկա բակալավրիատ)։ Կիսամյակը 16 շաբաթ է, մեկ մուտքը՝ 2 լսարանային ժամ,
 * հետևաբար շաբաթական մուտքերի քանակը = ժամաքանակ / 2 / 16 = ժամաքանակ / 32։
 */
export const WEEKS_PER_SEMESTER = 16
export const HOURS_PER_ENTRY = 2
export const HOURS_PER_WEEKLY_ENTRY = HOURS_PER_ENTRY * WEEKS_PER_SEMESTER
export const HOURS_STEP = HOURS_PER_WEEKLY_ENTRY / 2

/** Առաջարկվող ժամաքանակները՝ 16, 32, 48 … 160։ */
export const SUGGESTED_HOURS: number[] = Array.from({ length: 10 }, (_, index) => (index + 1) * HOURS_STEP)

export const entriesForHours = (hours: number): number => hours / HOURS_PER_WEEKLY_ENTRY

/** Մեկ մասի կշիռը մուտքերով. ամբողջ դաս → 1, համարիչ/հայտարար → 0,5։ */
export const partWeight = (partsCount: number): number => (partsCount > 0 ? 1 / partsCount : 0)

export const roundEntries = (value: number): number => Math.round(value * 1000) / 1000

/** 0,5 → «0,5», 2 → «2»։ */
export const formatEntries = (entries: number): string =>
  Number.isInteger(entries) ? String(entries) : entries.toFixed(1).replace('.', ',')

/** Բացատրություն ժամաքանակի կողքին, օր.՝ «1,5 մուտք (1 ամբողջ + համարիչ/հայտարար)»։ */
export const describeHours = (hours: number): string => {
  const entries = entriesForHours(hours)
  const whole = Math.floor(entries)
  const hasHalf = entries - whole >= 0.5
  const parts: string[] = []
  if (whole > 0) parts.push(`${whole} ամբողջ մուտք`)
  if (hasHalf) parts.push('կես մուտք (համարիչ/հայտարար)')
  return `${formatEntries(entries)} մուտք${parts.length > 0 ? ` — ${parts.join(' + ')}` : ''}`
}
