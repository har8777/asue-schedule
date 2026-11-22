import type { Database } from '../../core/database/database.ts'
import type { FacultyDivision } from './divisions.types.ts'

interface DivisionRow {
  id: string
  faculty_id: string
  name: string
  building: string
  sort_order: number
  is_published: number
  created_at: string
}

const toDivision = (row: DivisionRow): FacultyDivision => ({
  id: row.id,
  facultyId: row.faculty_id,
  name: row.name,
  building: row.building,
  sortOrder: row.sort_order,
  isPublished: row.is_published === 1,
  createdAt: row.created_at,
})

export class DivisionsRepository {
  private readonly db: Database

  constructor(db: Database) {
    this.db = db
  }

  findAll(): FacultyDivision[] {
    return this.db.all<DivisionRow>('SELECT * FROM faculty_divisions ORDER BY sort_order, name').map(toDivision)
  }

  findByFaculty(facultyId: string): FacultyDivision[] {
    return this.db
      .all<DivisionRow>('SELECT * FROM faculty_divisions WHERE faculty_id = ? ORDER BY sort_order, name', facultyId)
      .map(toDivision)
  }

  findById(id: string): FacultyDivision | null {
    const row = this.db.get<DivisionRow>('SELECT * FROM faculty_divisions WHERE id = ?', id)
    return row ? toDivision(row) : null
  }

  findByName(facultyId: string, name: string): FacultyDivision | null {
    const row = this.db.get<DivisionRow>(
      'SELECT * FROM faculty_divisions WHERE faculty_id = ? AND name = ?',
      facultyId,
      name,
    )
    return row ? toDivision(row) : null
  }

  nextSortOrder(facultyId: string): number {
    return (
      (this.db.get<{ value: number | null }>(
        'SELECT MAX(sort_order) AS value FROM faculty_divisions WHERE faculty_id = ?',
        facultyId,
      )?.value ?? 0) + 1
    )
  }

  insert(division: FacultyDivision): void {
    this.db.run(
      `INSERT INTO faculty_divisions (id, faculty_id, name, building, sort_order, is_published, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      division.id,
      division.facultyId,
      division.name,
      division.building,
      division.sortOrder,
      division.isPublished ? 1 : 0,
      division.createdAt,
    )
  }

  update(division: FacultyDivision): void {
    this.db.run(
      'UPDATE faculty_divisions SET name = ?, building = ?, sort_order = ?, is_published = ? WHERE id = ?',
      division.name,
      division.building,
      division.sortOrder,
      division.isPublished ? 1 : 0,
      division.id,
    )
  }

  delete(id: string): void {
    this.db.run('DELETE FROM faculty_divisions WHERE id = ?', id)
  }
}
