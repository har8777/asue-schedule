import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { DatabaseSync, type SQLInputValue } from 'node:sqlite'

export type SqlParam = SQLInputValue

/**
 * node:sqlite-ի բարակ փաթաթում։ Repository-ները կախված են միայն այս դասից,
 * ուստի ապագայում այլ բազայի (օր.՝ PostgreSQL) անցնելը տեղային փոփոխություն է։
 */
export class Database {
  private readonly db: DatabaseSync
  private transactionDepth = 0

  constructor(filePath: string) {
    if (filePath !== ':memory:') mkdirSync(dirname(filePath), { recursive: true })
    this.db = new DatabaseSync(filePath)
    this.db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;')
  }

  all<T>(sql: string, ...params: SqlParam[]): T[] {
    return this.db.prepare(sql).all(...params) as T[]
  }

  get<T>(sql: string, ...params: SqlParam[]): T | undefined {
    return this.db.prepare(sql).get(...params) as T | undefined
  }

  run(sql: string, ...params: SqlParam[]): number {
    return Number(this.db.prepare(sql).run(...params).changes)
  }

  exec(sql: string): void {
    this.db.exec(sql)
  }

  /** Կատարում է ֆունկցիան մեկ գործարքի մեջ (ներդրված կանչերը միանում են արտաքինին)։ */
  transaction<T>(work: () => T): T {
    if (this.transactionDepth > 0) return work()
    this.db.exec('BEGIN IMMEDIATE')
    this.transactionDepth++
    try {
      const result = work()
      this.db.exec('COMMIT')
      return result
    } catch (error) {
      this.db.exec('ROLLBACK')
      throw error
    } finally {
      this.transactionDepth--
    }
  }

  close(): void {
    this.db.close()
  }
}
