export type CatalogType = 'subject' | 'lecturer' | 'room'

export const CATALOG_TYPE_LABELS: Record<CatalogType, string> = {
  subject: 'Առարկաներ',
  lecturer: 'Դասախոսներ',
  room: 'Լսարաններ',
}

export const CATALOG_TYPE_SINGULAR: Record<CatalogType, string> = {
  subject: 'Առարկա',
  lecturer: 'Դասախոս',
  room: 'Լսարան',
}

export interface CatalogItem {
  id: string
  facultyId: string
  type: CatalogType
  name: string
  floor: string
  createdAt: string
}

export interface FacultyCatalog {
  subjects: CatalogItem[]
  lecturers: CatalogItem[]
  rooms: CatalogItem[]
}

export interface CatalogImportRow {
  facultyName: string
  type: CatalogType
  name: string
  floor?: string
}

export const EMPTY_CATALOG: FacultyCatalog = { subjects: [], lecturers: [], rooms: [] }
