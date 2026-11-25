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
      // Ուսումնական բաժնի պետի պաշտոնում հաճախակի փոփոխություններ են լինում,
      // այդ պատճառով անունը նախապես չենք լրացնում (տես` migration #11)
      const defaults: Record<string, string> = {
        approverName: 'Լ. Դանիելյան',
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
  {
    version: 11,
    name: 'clear-interim-academic-head-name',
    run: (db) => {
      // #10-ը (եթե արդեն կիրառվել է) ուսումնական բաժնի պետի տեղում լրացրել էր
      // «Ա. Պետրոսյան»-ը. այդ պաշտոնում շատ փոփոխություններ են եղել, ուստի
      // հանում ենք այդ նախնական արժեքը, եթե օգտատերը չի փոխարինել այն այլ անունով։
      const row = db.get<{ value: string }>("SELECT value FROM settings WHERE key = 'public_settings'")
      if (!row) return
      let stored: Record<string, unknown>
      try {
        stored = JSON.parse(row.value) as Record<string, unknown>
      } catch {
        return
      }
      if (stored.academicHeadName !== 'Ա. Պետրոսյան') return
      stored.academicHeadName = ''
      db.run("UPDATE settings SET value = ? WHERE key = 'public_settings'", JSON.stringify(stored))
      console.log('[DB] Ուսումնական բաժնի պետի ժամանակավոր անունը հանվեց կարգավորումներից')
    },
  },
  {
    version: 12,
    name: 'drop-academic-head-signatory',
    run: (db) => {
      // Պաշտոնական թղթային նմուշում դասացուցակի տակ երկու ստորագրող կա՝
      // «Ակադեմիական կազմի սպասարկման բաժնի պետ» և ֆակուլտետի դեկանը։
      // «Ուսումնական բաժնի պետ»-ը մերն էր ավելացրած և հանվում է ամբողջությամբ։
      const row = db.get<{ value: string }>("SELECT value FROM settings WHERE key = 'public_settings'")
      if (!row) return
      let stored: Record<string, unknown>
      try {
        stored = JSON.parse(row.value) as Record<string, unknown>
      } catch {
        return
      }
      const keys = ['academicHeadLabel', 'academicHeadName', 'academicHeadSignature']
      if (!keys.some((key) => key in stored)) return
      for (const key of keys) delete stored[key]
      db.run("UPDATE settings SET value = ? WHERE key = 'public_settings'", JSON.stringify(stored))
      console.log('[DB] «Ուսումնական բաժնի պետ» դաշտերը հանվեցին կարգավորումներից')
    },
  },
]
