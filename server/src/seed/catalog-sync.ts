import type { Database } from '../core/database/database.ts'
import { createId, normalizeName, nowIso } from '../core/utils/id.ts'
import type { LessonPart } from '../modules/lessons/lessons.types.ts'
import { OFFICIAL_CATALOG } from './catalog.data.ts'

export interface CatalogSyncResult {
  added: number
  removed: number
}

type SyncedType = 'subject' | 'lecturer'

/**
 * Ֆակուլտետների առարկաների և դասախոսների ցուցակը համապատասխանեցնում է
 * պաշտոնական տեղեկատուին (OFFICIAL_CATALOG)։
 * - Ավելացնում է պակասող անունները։
 * - Հեռացնում է ցուցակում չեղածները, բացառությամբ նրանց, որոնք արդեն օգտագործված են
 *   որևէ դասում (որ ոչինչ չկորչի)։
 * Լսարաններին չի դիպչում։
 */
export const syncOfficialCatalog = (db: Database): CatalogSyncResult => {
  let added = 0
  let removed = 0

  for (const [facultyId, catalog] of Object.entries(OFFICIAL_CATALOG)) {
    if (!db.get('SELECT id FROM faculties WHERE id = ?', facultyId)) continue

    const usedNames = new Set<string>()
    const lessons = db.all<{ parts: string }>(
      'SELECT l.parts FROM lessons l JOIN cohorts c ON c.id = l.cohort_id WHERE c.faculty_id = ?',
      facultyId,
    )
    for (const { parts } of lessons) {
      for (const part of JSON.parse(parts) as LessonPart[]) {
        if (part.subject) usedNames.add(`subject|${normalizeName(part.subject)}`)
        part.lecturers.forEach((name) => usedNames.add(`lecturer|${normalizeName(name)}`))
      }
    }

    const official: Record<SyncedType, string[]> = { subject: catalog.subjects, lecturer: catalog.lecturers }
    for (const type of ['subject', 'lecturer'] as const) {
      const keep = new Set(official[type].map(normalizeName))
      const existing = db.all<{ id: string; name: string }>(
        'SELECT id, name FROM catalog_items WHERE faculty_id = ? AND type = ?',
        facultyId,
        type,
      )
      for (const item of existing) {
        const key = normalizeName(item.name)
        if (!keep.has(key) && !usedNames.has(`${type}|${key}`)) {
          removed += db.run('DELETE FROM catalog_items WHERE id = ?', item.id)
        }
      }
      for (const name of official[type]) {
        added += db.run(
          `INSERT INTO catalog_items (id, faculty_id, type, name, floor, created_at) VALUES (?, ?, ?, ?, '', ?)
           ON CONFLICT (faculty_id, type, name) DO NOTHING`,
          createId(),
          facultyId,
          type,
          name,
          nowIso(),
        )
      }
    }
  }
  return { added, removed }
}
