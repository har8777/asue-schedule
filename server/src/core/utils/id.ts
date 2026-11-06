import { randomUUID } from 'node:crypto'

export const createId = (): string => randomUUID()

export const nowIso = (): string => new Date().toISOString()

/** Համեմատության համար. փոքրատառ, առանց ավելորդ բացատների։ */
export const normalizeName = (value: string): string => value.trim().replace(/\s+/g, ' ').toLocaleLowerCase('hy')
