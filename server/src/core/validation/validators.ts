import { badRequest } from '../http/http-error.ts'

/**
 * Մուտքային տվյալների ստուգման փոքր գործիքներ։ Սխալի դեպքում նետում են 400
 * հայերեն հաղորդագրությամբ, որը frontend-ը ցույց է տալիս օգտատիրոջը։
 */
export const asRecord = (value: unknown, label = 'Հարցման մարմինը'): Record<string, unknown> => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw badRequest(`${label} պետք է լինի օբյեկտ`)
  }
  return value as Record<string, unknown>
}

export const requireString = (value: unknown, label: string, options: { min?: number; max?: number } = {}): string => {
  const { min = 1, max = 200 } = options
  if (typeof value !== 'string') throw badRequest(`«${label}» դաշտը պարտադիր է`)
  const trimmed = value.trim()
  if (trimmed.length < min) throw badRequest(`«${label}» դաշտը պետք է ունենա առնվազն ${min} նիշ`)
  if (trimmed.length > max) throw badRequest(`«${label}» դաշտը չի կարող գերազանցել ${max} նիշը`)
  return trimmed
}

export const optionalString = (value: unknown, label: string, max = 200): string | undefined => {
  if (value === undefined || value === null) return undefined
  if (typeof value !== 'string') throw badRequest(`«${label}» դաշտը պետք է լինի տեքստ`)
  const trimmed = value.trim()
  if (trimmed.length > max) throw badRequest(`«${label}» դաշտը չի կարող գերազանցել ${max} նիշը`)
  return trimmed
}

export const optionalBoolean = (value: unknown, label: string): boolean | undefined => {
  if (value === undefined || value === null) return undefined
  if (typeof value !== 'boolean') throw badRequest(`«${label}» դաշտը պետք է լինի true/false`)
  return value
}

export const requireOneOf = <T extends string>(value: unknown, allowed: readonly T[], label: string): T => {
  if (typeof value !== 'string' || !allowed.includes(value as T)) {
    throw badRequest(`«${label}» դաշտի արժեքը անվավեր է`)
  }
  return value as T
}

export const requireArray = (value: unknown, label: string, options: { min?: number; max?: number } = {}): unknown[] => {
  const { min = 0, max = 1000 } = options
  if (!Array.isArray(value)) throw badRequest(`«${label}» դաշտը պետք է լինի ցուցակ`)
  if (value.length < min || value.length > max) {
    throw badRequest(`«${label}» ցուցակը պետք է ունենա ${min}-ից ${max} տարր`)
  }
  return value
}

export const stringList = (value: unknown, label: string, maxItems = 10): string[] => {
  if (value === undefined || value === null) return []
  return requireArray(value, label, { max: maxItems })
    .map((item) => requireString(item, label, { min: 0, max: 200 }))
    .filter(Boolean)
}
