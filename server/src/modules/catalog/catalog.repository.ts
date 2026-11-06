import type { Database } from '../../core/database/database.ts'
import { createId, nowIso } from '../../core/utils/id.ts'
import type { CatalogItem, CatalogType } from './catalog.types.ts'

interface CatalogRow {
  id: string
  faculty_id: string
  type: CatalogType
  name: string
  floor: string
  created_at: string
}

const toItem = (row: CatalogRow): CatalogItem => ({
  id: row.id,
  facultyId: row.faculty_id,
  type: row.type,
  name: row.name,
  floor: row.floor,
  createdAt: row.created_at,
})

export class CatalogRepository {
  private readonly db: Database

  constructor(db: Database) {
    this.db = db
  }

  findByFaculty(facultyId: string): CatalogItem[] {
    return this.db
      .all<CatalogRow>('SELECT * FROM catalog_items WHERE faculty_id = ? ORDER BY type, floor, name', facultyId)
      .map(toItem)
  }

  findAll(): CatalogItem[] {
    return this.db.all<CatalogRow>('SELECT * FROM catalog_items ORDER BY faculty_id, type, name').map(toItem)
  }

  findAllByType(type: CatalogType): CatalogItem[] {
    return this.db.all<CatalogRow>('SELECT * FROM catalog_items WHERE type = ? ORDER BY name', type).map(toItem)
  }

  findById(id: string): CatalogItem | null {
    const row = this.db.get<CatalogRow>('SELECT * FROM catalog_items WHERE id = ?', id)
    return row ? toItem(row) : null
  }

  /** Ավելացնում է, եթե նույն անունով տարր չկա։ Վերադարձնում է true, եթե ավելացվեց։ */
  insertIfMissing(facultyId: string, type: CatalogType, name: string, floor = ''): boolean {
    return (
      this.db.run(
        `INSERT INTO catalog_items (id, faculty_id, type, name, floor, created_at) VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT (faculty_id, type, name) DO NOTHING`,
        createId(),
        facultyId,
        type,
        name,
        floor,
        nowIso(),
      ) > 0
    )
  }

  insertRaw(item: CatalogItem): void {
    this.db.run(
      'INSERT OR IGNORE INTO catalog_items (id, faculty_id, type, name, floor, created_at) VALUES (?, ?, ?, ?, ?, ?)',
      item.id,
      item.facultyId,
      item.type,
      item.name,
      item.floor,
      item.createdAt,
    )
  }

  delete(id: string): void {
    this.db.run('DELETE FROM catalog_items WHERE id = ?', id)
  }

  deleteAll(): void {
    this.db.run('DELETE FROM catalog_items')
  }
}
