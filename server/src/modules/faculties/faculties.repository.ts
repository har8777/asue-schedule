import type { Database } from '../../core/database/database.ts'
import type { Faculty } from './faculties.types.ts'

interface FacultyRow {
  id: string
  name: string
  short_name: string
  building: string
  sort_order: number
  created_at: string
}

const toFaculty = (row: FacultyRow): Faculty => ({
  id: row.id,
  name: row.name,
  shortName: row.short_name,
  building: row.building,
  sortOrder: row.sort_order,
  createdAt: row.created_at,
})

export class FacultiesRepository {
  private readonly db: Database

  constructor(db: Database) {
    this.db = db
  }

  findAll(): Faculty[] {
    return this.db.all<FacultyRow>('SELECT * FROM faculties ORDER BY sort_order, name').map(toFaculty)
  }

  findById(id: string): Faculty | null {
    const row = this.db.get<FacultyRow>('SELECT * FROM faculties WHERE id = ?', id)
    return row ? toFaculty(row) : null
  }

  findByName(name: string): Faculty | null {
    const row = this.db.get<FacultyRow>('SELECT * FROM faculties WHERE name = ?', name)
    return row ? toFaculty(row) : null
  }

  nextSortOrder(): number {
    return (this.db.get<{ value: number | null }>('SELECT MAX(sort_order) AS value FROM faculties')?.value ?? 0) + 1
  }

  insert(faculty: Faculty): void {
    this.db.run(
      'INSERT INTO faculties (id, name, short_name, building, sort_order, created_at) VALUES (?, ?, ?, ?, ?, ?)',
      faculty.id,
      faculty.name,
      faculty.shortName,
      faculty.building,
      faculty.sortOrder,
      faculty.createdAt,
    )
  }

  update(faculty: Faculty): void {
    this.db.run(
      'UPDATE faculties SET name = ?, short_name = ?, building = ?, sort_order = ? WHERE id = ?',
      faculty.name,
      faculty.shortName,
      faculty.building,
      faculty.sortOrder,
      faculty.id,
    )
  }

  delete(id: string): void {
    this.db.run('DELETE FROM faculties WHERE id = ?', id)
  }

  deleteAll(): void {
    this.db.run('DELETE FROM faculties')
  }
}
