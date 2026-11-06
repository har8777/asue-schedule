import type { CatalogImportRow, CatalogType } from '../catalog.types'

/**
 * Excel ֆայլի ձևաչափը (նույնը, ինչ հին տարբերակում)՝ «Ընդհանուր բազա» թերթ,
 * սյունակներ՝ Ֆակուլտետ | Տեսակ | Անվանում | Հարկ (ըստ ցանկության)։
 */
export const CATALOG_SHEET_NAME = 'Ընդհանուր բազա'

const TYPE_BY_LABEL: Record<string, CatalogType> = {
  'Դասընթաց': 'subject',
  'Առարկա': 'subject',
  'Դասախոս': 'lecturer',
  'Լսարան': 'room',
}

export const parseCatalogWorkbook = async (file: File): Promise<CatalogImportRow[]> => {
  const XLSX = await import('xlsx')
  const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array' })
  const sheet = workbook.Sheets[CATALOG_SHEET_NAME] ?? workbook.Sheets[workbook.SheetNames[0]]
  if (!sheet) return []

  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet)
  return rows.flatMap((row) => {
    const facultyName = String(row['Ֆակուլտետ'] ?? '').trim()
    const type = TYPE_BY_LABEL[String(row['Տեսակ'] ?? '').trim()]
    const name = String(row['Անվանում'] ?? '').trim()
    const floor = String(row['Հարկ'] ?? '').trim()
    return facultyName && type && name ? [{ facultyName, type, name, floor: floor || undefined }] : []
  })
}

export const downloadCatalogTemplate = async (facultyNames: string[]): Promise<void> => {
  const XLSX = await import('xlsx')
  const example = facultyNames[0] ?? 'Կառավարման ֆակուլտետ'
  const sheet = XLSX.utils.json_to_sheet([
    { 'Ֆակուլտետ': example, 'Տեսակ': 'Դասընթաց', 'Անվանում': 'Մենեջմենթ', 'Հարկ': '' },
    { 'Ֆակուլտետ': example, 'Տեսակ': 'Դասախոս', 'Անվանում': 'Ազգանուն Անուն', 'Հարկ': '' },
    { 'Ֆակուլտետ': example, 'Տեսակ': 'Լսարան', 'Անվանում': '305', 'Հարկ': '3-րդ հարկ' },
  ])
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, sheet, CATALOG_SHEET_NAME)
  XLSX.writeFile(workbook, 'tegekatu-template.xlsx')
}
