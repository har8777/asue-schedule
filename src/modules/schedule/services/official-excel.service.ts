import type { Range } from 'xlsx'
import type { PublicSettings } from '../../settings/settings.types'
import { toFileName } from '../../common/utils/download'
import { buildOfficialRows, collectSlots, formatDate } from '../schedule.calendar'
import { DAY_LABELS } from '../schedule.constants'
import { buildDocumentSubtitle } from '../schedule.official'
import type { Cohort, Lesson } from '../schedule.types'

interface OfficialExcelOptions {
  cohort: Cohort
  lessons: Map<string, Lesson>
  settings: PublicSettings
  facultyName: string
  /** Ֆակուլտետի դեկանը՝ ստորագրության երկրորդ տողում։ */
  deanName?: string
}

/** Excel-ում թերթի անունը չի կարող ունենալ այս նիշերը և լինել 31-ից երկար։ */
const sheetName = (value: string): string => value.replace(/[\\/?*[\]:]/g, ' ').slice(0, 31)

/**
 * Արտահանում է պաշտոնական ձևաչափով Excel ֆայլ՝ յուրաքանչյուր հոսքի համար առանձին
 * թերթ։ Կառուցվածքը կրկնում է ՀՊՏՀ-ի դասացուցակը՝ շաբաթներ, ամսաթվեր և
 * դասաժամեր՝ Առարկա / Դասախոս / Լսարան ենթասյունակներով։
 */
export const downloadOfficialExcel = async ({
  cohort,
  lessons,
  settings,
  facultyName,
  deanName,
}: OfficialExcelOptions): Promise<void> => {
  const XLSX = await import('xlsx')
  const slots = collectSlots(cohort)
  const workbook = XLSX.utils.book_new()

  for (const stream of cohort.settings.streams) {
    const rows = buildOfficialRows({ cohort, lessons, streamId: stream.id, settings, slots })
    const data: (string | number)[][] = []

    // Գլխամասը՝ ինչպես թղթային նմուշում. «ԴԱՍԱՑՈՒՑԱԿ» և նույն ենթավերնագիրը,
    // ինչ էկրանին ու PDF-ում (ֆակուլտետ/կուրս առանձին տողեր չեն ավելացվում)
    data.push(['ԴԱՍԱՑՈՒՑԱԿ'])
    data.push([buildDocumentSubtitle({ facultyName, settings, cohort, streamName: stream.name })])
    data.push([])

    // Վերնագրի երեք տող՝ ինչպես պաշտոնական ձևում
    const slotHeader: string[] = ['Շաբաթներ', 'Օրեր']
    const fieldHeader: string[] = ['', '']
    slots.forEach((slot) => {
      slotHeader.push(slot, '', '')
      fieldHeader.push('Առարկա', 'Դասախոս', 'Լսարան')
    })
    const headerRowIndex = data.length
    data.push(slotHeader)
    data.push(fieldHeader)
    data.push(['1', '2', ...slots.flatMap((_, index) => [`${index * 3 + 3}`, `${index * 3 + 4}`, `${index * 3 + 5}`])])

    const firstDataRow = data.length
    rows.forEach((row) => {
      const line: string[] = [
        row.weekRowSpan > 0 ? String(row.week) : '',
        row.date ? formatDate(row.date) : DAY_LABELS[row.day],
      ]
      row.cells.forEach((cell) => {
        line.push(cell.part?.subject ?? '', cell.part?.lecturers.join('\n') ?? '', cell.part?.rooms.join('\n') ?? '')
      })
      data.push(line)
    })

    // Ստորագրողները՝ նույնը, ինչ փաստաթղթի ներքևում
    data.push([])
    data.push([`${settings.partTimeHeadLabel}՝`, '', settings.partTimeHeadName])
    data.push([`${facultyName}ի դեկան՝`, '', deanName ?? ''])

    const sheet = XLSX.utils.aoa_to_sheet(data)
    const merges: Range[] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 1 + slots.length * 3 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: 1 + slots.length * 3 } },
      { s: { r: headerRowIndex, c: 0 }, e: { r: headerRowIndex + 1, c: 0 } },
      { s: { r: headerRowIndex, c: 1 }, e: { r: headerRowIndex + 1, c: 1 } },
      ...slots.map((_, index) => ({
        s: { r: headerRowIndex, c: 2 + index * 3 },
        e: { r: headerRowIndex, c: 4 + index * 3 },
      })),
    ]
    // Շաբաթի համարը միավորվում է իր օրերի վրա
    rows.forEach((row, index) => {
      if (row.weekRowSpan > 1) {
        merges.push({
          s: { r: firstDataRow + index, c: 0 },
          e: { r: firstDataRow + index + row.weekRowSpan - 1, c: 0 },
        })
      }
    })
    sheet['!merges'] = merges
    sheet['!cols'] = [{ wch: 10 }, { wch: 13 }, ...slots.flatMap(() => [{ wch: 26 }, { wch: 22 }, { wch: 9 }])]

    XLSX.utils.book_append_sheet(workbook, sheet, sheetName(`${cohort.name} ${stream.name}`))
  }

  XLSX.writeFile(workbook, `${toFileName(`${facultyName} ${cohort.name}`)}.xlsx`)
}
