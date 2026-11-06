export const CATALOG_TYPES = ['subject', 'lecturer', 'room'] as const
export type CatalogType = (typeof CATALOG_TYPES)[number]

/** Ֆակուլտետի տեղեկատու՝ առարկաներ, դասախոսներ և լսարաններ։ */
export interface CatalogItem {
  id: string
  facultyId: string
  type: CatalogType
  name: string
  /** Միայն լսարանների համար՝ հարկը (օր.՝ «1-ին հարկ»)։ */
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
