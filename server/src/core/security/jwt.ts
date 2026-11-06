import { createHmac, timingSafeEqual } from 'node:crypto'

const encode = (value: object): string => Buffer.from(JSON.stringify(value)).toString('base64url')

/** HS256 JWT՝ առանց արտաքին գրադարանների։ */
export class JwtService {
  private readonly secret: string
  private readonly ttlSeconds: number

  constructor(secret: string, ttlSeconds: number) {
    this.secret = secret
    this.ttlSeconds = ttlSeconds
  }

  sign<T extends object>(payload: T): { token: string; expiresAt: string } {
    const issuedAt = Math.floor(Date.now() / 1000)
    const exp = issuedAt + this.ttlSeconds
    const body = `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({ ...payload, iat: issuedAt, exp })}`
    return { token: `${body}.${this.signature(body)}`, expiresAt: new Date(exp * 1000).toISOString() }
  }

  verify<T extends object>(token: string): T | null {
    const [header, payload, signature] = token.split('.')
    if (!header || !payload || !signature) return null

    const expected = Buffer.from(this.signature(`${header}.${payload}`))
    const actual = Buffer.from(signature)
    if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null

    try {
      const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as T & { exp?: number }
      if (!decoded.exp || decoded.exp < Math.floor(Date.now() / 1000)) return null
      return decoded
    } catch {
      return null
    }
  }

  private signature(data: string): string {
    return createHmac('sha256', this.secret).update(data).digest('base64url')
  }
}
