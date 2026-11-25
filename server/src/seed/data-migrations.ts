import type { Migration } from '../core/database/migrations.ts'
import { syncOfficialCatalog } from './catalog-sync.ts'

/**
 * Տվյալների միգրացիաներ, որոնք կիրառվում են արդեն գործող բազաներում մեկ անգամ։
 * Նոր բազայում դրանք անվնաս են (ֆակուլտետները դեռ չկան), իսկ տվյալները լրացնում է seed-ը։
 */
export const DATA_MIGRATIONS: Migration[] = [
  {
    version: 3,
    name: 'official-catalog-2026-autumn',
    run: (db) => {
      const { added, removed } = syncOfficialCatalog(db)
      if (added || removed) console.log(`[DB] Տեղեկատուն թարմացվեց. ավելացվեց ${added}, հեռացվեց ${removed}`)
    },
  },
  {
    version: 10,
    name: 'official-signatory-names',
    run: (db) => {
      // Եթե կարգավորումները արդեն պահված են, նոր նախնականները չեն կիրառվում.
      // լրացնում ենք միայն **դատարկ** դաշտերը, օգտատիրոջ գրածին ձեռք չտալով։
      const row = db.get<{ value: string }>("SELECT value FROM settings WHERE key = 'public_settings'")
      if (!row) return
      let stored: Record<string, unknown>
      try {
        stored = JSON.parse(row.value) as Record<string, unknown>
      } catch {
        return
      }
      const defaults: Record<string, string> = {
        approverName: 'Լ. Դանիելյան',
        academicHeadName: 'Ա. Պետրոսյան',
        partTimeHeadName: 'Ժ. Ստեփանյան',
      }
      let changed = false
      for (const [key, value] of Object.entries(defaults)) {
        if (stored[key] === undefined || stored[key] === '') {
          stored[key] = value
          changed = true
        }
      }
      if (!changed) return
      db.run("UPDATE settings SET value = ? WHERE key = 'public_settings'", JSON.stringify(stored))
      console.log('[DB] Ստորագրողների անունները լրացվեցին պաշտոնական նմուշից')
    },
  },
]
