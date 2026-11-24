import { SUGGESTED_HOURS } from '../curriculum.constants'
import type { PlanImportRow } from '../curriculum.types'

/**
 * Ուսումնական պլանի Excel ֖այլի ձևաչափը։ Վերնագրերը ճանաչվում են ճկուն՝
 * «Դասընթաց» և «Առարկա» նույնն են, «Ժամ» և «Ժամաքանակ» նույնը, մեծատառ/փոքրատառ
 * և ավելորդ բացատները նշանակություն չունեն։ «Ֆակուլտետ» և «Կուրս» սյունակները
 * պարտադիր են միայն այն դեպքում, երբ ֖այլը մեկից ավելի կուրս է պարունակում։
 */
export const PLAN_SHEET_NAME = 'Ուսումնական պլան'

const HEADER_ALIASES: Record<string, keyof ParsedHeaders> = {
  'ֆակուլտետ': 'faculty',
  'ֆակուլտետի անվանում': 'faculty',
  'կուրս': 'cohort',
  'կուրսի անվանում': 'cohort',
  'դասընթաց': 'subject',
  'առարկա': 'subject',
  'դասընթացի անվանում': 'subject',
  'ժամաքանակ': 'hours',
  'ժամ': 'hours',
  'ժամեր': 'hours',
  'կիսամյակային ժամաքանակ': 'hours',
}

interface ParsedHeaders {
  faculty?: string
  cohort?: string
  subject?: string
  hours?: string
}

export interface ParsedPlanFile {
  rows: PlanImportRow[]
  /** Տողեր, որոնք չեն կարդացվել ֖այլի մակարդակում (դատարկ անուն կամ ժամաքանակ)։ */
  problems: { row: number; reason: string }[]
  /** Ֆայլում հանդիպած կուրսերը՝ «Ֆակուլտետ — Կուրս» տեսքով։ */
  cohortLabels: string[]
  hasCohortColumns: boolean
}

const normalizeHeader = (value: string): string => value.trim().replace(/\s+/g, ' ').toLocaleLowerCase('hy')

/** Գտնում է, թե ֖այլի որ սյունակը ինչ դաշտ է։ */
const mapHeaders = (sample: Record<string, unknown>): ParsedHeaders => {
  const headers: ParsedHeaders = {}
  for (const key of Object.keys(sample)) {
    const field = HEADER_ALIASES[normalizeHeader(key)]
    if (field && headers[field] === undefined) headers[field] = key
  }
  return headers
}

const readCell = (row: Record<string, unknown>, column: string | undefined): string =>
  column === undefined ? '' : String(row[column] ?? '').trim()

/**
 * Կարդում է օգտատիրոջ կազմած Excel ֖այլը։ Եթե «Ֆակուլտետ»/«Կուրս» սյունակները չկան,
 * տողերը վերագրվում են ընթացիկ ընտրված կուրսին (`fallbackCohortId`)։
 */
export const parsePlanWorkbook = async (
  file: File,
  fallback?: { cohortId: string; label: string },
): Promise<ParsedPlanFile> => {
  const XLSX = await import('xlsx')
  const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array' })
  const sheet = workbook.Sheets[PLAN_SHEET_NAME] ?? workbook.Sheets[workbook.SheetNames[0]]
  if (!sheet) return { rows: [], problems: [], cohortLabels: [], hasCohortColumns: false }

  const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' })
  if (raw.length === 0) return { rows: [], problems: [], cohortLabels: [], hasCohortColumns: false }

  const headers = mapHeaders(raw[0])
  if (headers.subject === undefined) {
    throw new Error('Ֆայլում չկա «Դասընթաց» սյունակը։ Ներբեռնեք ձևանմուշը և լրացրեք ըստ նրա։')
  }
  if (headers.hours === undefined) {
    throw new Error('Ֆայլում չկա «Ժամաքանակ» սյունակը։ Ներբեռնեք ձևանմուշը և լրացրեք ըստ նրա։')
  }

  const hasCohortColumns = headers.faculty !== undefined && headers.cohort !== undefined
  if (!hasCohortColumns && fallback === undefined) {
    throw new Error('Ֆայլում չկան «Ֆակուլտետ» և «Կուրս» սյունակները։ Կամ ավելացրեք դրանք, կամ ընտրեք կուրսը։')
  }

  const rows: PlanImportRow[] = []
  const problems: ParsedPlanFile['problems'] = []
  const labels = new Set<string>()

  raw.forEach((row, index) => {
    // Վերնագիրը 1-ին տողն է, ուստի տվյալների առաջին տողը՝ 2-րդ
    const line = index + 2
    const subject = readCell(row, headers.subject)
    const hoursText = readCell(row, headers.hours)
    const facultyName = readCell(row, headers.faculty)
    const cohortName = readCell(row, headers.cohort)

    // Լրիվ դատարկ տողերը լուռ անտեսվում են՝ Excel-ում դրանք սովորական են
    if (!subject && !hoursText && !facultyName && !cohortName) return

    if (!subject) {
      problems.push({ row: line, reason: 'Դասընթացի անունը դատարկ է' })
      return
    }
    const hours = Number(hoursText.replace(',', '.'))
    if (!hoursText || !Number.isFinite(hours) || hours <= 0) {
      problems.push({ row: line, reason: `«${subject}»՝ ժամաքանակը թիվ չէ («${hoursText || '—'}»)` })
      return
    }

    if (hasCohortColumns) {
      if (!facultyName || !cohortName) {
        problems.push({ row: line, reason: `«${subject}»՝ ֆակուլտետը կամ կուրսը լրացված չէ` })
        return
      }
      labels.add(`${facultyName} — ${cohortName}`)
      rows.push({ facultyName, cohortName, subject, hours: Math.round(hours), line })
    } else if (fallback) {
      labels.add(fallback.label)
      rows.push({ cohortId: fallback.cohortId, subject, hours: Math.round(hours), line })
    }
  })

  return { rows, problems, cohortLabels: [...labels], hasCohortColumns }
}

/**
 * Ներբեռնում է ձևանմուշը՝ լրացված օրինակով։ Առաջին թերթում՝ տվյալները,
 * երկրորդում՝ կարճ բացատրություն ժամահաշվարկի մասին։
 */
export const downloadPlanTemplate = async (options: {
  facultyName: string
  cohortNames: string[]
  subjects: string[]
}): Promise<void> => {
  const XLSX = await import('xlsx')
  const cohortName = options.cohortNames[0] ?? '1-ին կուրս'
  const examples = options.subjects.length > 0 ? options.subjects.slice(0, 4) : ['Մենեջմենթ', 'Մարքեթինգ', 'Հայոց լեզու']

  const sheet = XLSX.utils.json_to_sheet(
    examples.map((subject, index) => ({
      'Ֆակուլտետ': options.facultyName,
      'Կուրս': cohortName,
      'Դասընթաց': subject,
      'Ժամաքանակ': SUGGESTED_HOURS[index % 3] ?? 32,
    })),
  )
  sheet['!cols'] = [{ wch: 44 }, { wch: 26 }, { wch: 40 }, { wch: 12 }]

  const help = XLSX.utils.aoa_to_sheet([
    ['Ինչպես լրացնել'],
    [''],
    ['1. «Ֆակուլտետ» սյունակում գրեք ֆակուլտետի լրիվ կամ կարճ անվանումը՝ ինչպես կայքում է։'],
    ['2. «Կուրս» սյունակում՝ կուրսի անվանումը ճիշտ այնպես, ինչպես կայքում է (օր.՝ «1-ին կուրս»)։'],
    ['3. Մեկ ֆայլում կարող են լինել մի քանի ֆակուլտետի և կուրսի տողեր։'],
    ['4. Եթե ներմուծում եք մեկ կուրսի համար, «Ֆակուլտետ» և «Կուրս» սյունակները կարող եք բաց թողնել։'],
    [''],
    ['Ժամահաշվարկ. կիսամյակը 16 շաբաթ է, մեկ մուտքը՝ 2 լսարանային ժամ'],
    ['Ժամաքանակ', 'Շաբաթական մուտք'],
    [16, '0,5 (համարիչ/հայտարար)'],
    [32, '1'],
    [48, '1,5'],
    [64, '2'],
    [80, '2,5'],
    [''],
    ['Ժամաքանակը կարող է լինել նաև 16-ի պատիկ չհանդիսացող թիվ։'],
    ['Ներմուծված դասընթացները մնում են սևագրում՝ մինչև «Հաստատել» սեղմելը ոչ ոք չի տեսնում։'],
  ])
  help['!cols'] = [{ wch: 92 }, { wch: 26 }]

  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, sheet, PLAN_SHEET_NAME)
  XLSX.utils.book_append_sheet(workbook, help, 'Բացատրություն')
  XLSX.writeFile(workbook, 'usumnakan-plan-dzevanmush.xlsx')
}
