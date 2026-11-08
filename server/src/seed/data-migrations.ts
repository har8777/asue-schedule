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
]
