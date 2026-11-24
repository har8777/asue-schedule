/**
 * Ժամահաշվարկ (առկա բակալավրիատ)։
 *
 * Կիսամյակի տևողությունը 16 շաբաթ է, իսկ մեկ մուտքը (վանդակը) համարժեք է 2
 * լսարանային ժամի։ Հետևաբար առարկայի շաբաթական մուտքերի քանակը հաշվվում է՝
 *
 *     մուտք = ժամաքանակ / 2 / 16 = ժամաքանակ / 32
 *
 * Օրինակ՝ 16 ժամ → 0,5 մուտք (համարիչ/հայտարար), 32 ժամ → 1 ամբողջ մուտք,
 * 48 ժամ → 1,5 մուտք, 64 ժամ → 2 մուտք, 80 ժամ → 2,5 մուտք։
 * Նույն կուրսի բոլոր հոսքերում առարկան անցնում է հավասարաչափ ժամերով։
 */
export const WEEKS_PER_SEMESTER = 16
export const HOURS_PER_ENTRY = 2
/** Մեկ շաբաթական մուտքին համապատասխանող կիսամյակային ժամաքանակը (2 × 16)։ */
export const HOURS_PER_WEEKLY_ENTRY = HOURS_PER_ENTRY * WEEKS_PER_SEMESTER

/** 16-ի պատիկները տալիս են ամբողջ կամ կես մուտք. ձեռքով կարելի է գրել ցանկացած արժեք։ */
export const HOURS_STEP = HOURS_PER_WEEKLY_ENTRY / 2
export const MIN_SUBJECT_HOURS = 1
export const MAX_SUBJECT_HOURS = 320
export const MAX_PLAN_SUBJECTS = 80

/** Առաջարկվող ժամաքանակները (16, 32, 48 … 160)։ */
export const SUGGESTED_HOURS: number[] = Array.from({ length: 10 }, (_, index) => (index + 1) * HOURS_STEP)

/** Ժամաքանակին համապատասխանող շաբաթական մուտքերի քանակը (0,5-ի պատիկ)։ */
export const entriesForHours = (hours: number): number => hours / HOURS_PER_WEEKLY_ENTRY

/** Մուտքերի քանակին համապատասխանող ժամաքանակը։ */
export const hoursForEntries = (entries: number): number => entries * HOURS_PER_WEEKLY_ENTRY

/** Մեկ մասի «կշիռը» մուտքերով. ամբողջ դաս → 1, համարիչ/հայտարար → 0,5։ */
export const partWeight = (partsCount: number): number => (partsCount > 0 ? 1 / partsCount : 0)

/** Կլորացում՝ լողացող կետի սխալները բացառելու համար (0,5-ի ճշտությամբ բավարար է)։ */
export const roundEntries = (value: number): number => Math.round(value * 1000) / 1000

/** Excel-ից մեկ ներմուծման առավելագույն տողերը։ */
export const MAX_IMPORT_ROWS = 5000
