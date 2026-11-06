import { randomBytes, scrypt, timingSafeEqual, type ScryptOptions } from 'node:crypto'

const KEY_LENGTH = 64
const SCRYPT_OPTIONS: ScryptOptions = { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 }

const deriveKey = (password: string, salt: Buffer): Promise<Buffer> =>
  new Promise((resolve, reject) => {
    scrypt(password, salt, KEY_LENGTH, SCRYPT_OPTIONS, (error, key) => (error ? reject(error) : resolve(key)))
  })

/** Գաղտնաբառերի հեշավորում scrypt ալգորիթմով (Node.js-ի ներկառուցված crypto)։ */
export const passwordHasher = {
  async hash(password: string): Promise<string> {
    const salt = randomBytes(16)
    const key = await deriveKey(password, salt)
    return `scrypt$${salt.toString('base64')}$${key.toString('base64')}`
  },

  async verify(password: string, stored: string): Promise<boolean> {
    const [algorithm, saltB64, keyB64] = stored.split('$')
    if (algorithm !== 'scrypt' || !saltB64 || !keyB64) return false
    const expected = Buffer.from(keyB64, 'base64')
    const actual = await deriveKey(password, Buffer.from(saltB64, 'base64'))
    return expected.length === actual.length && timingSafeEqual(expected, actual)
  },
}

export const generatePassword = (length = 12): string => {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'
  const bytes = randomBytes(length)
  return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join('')
}
