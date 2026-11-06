import type { IncomingMessage } from 'node:http'
import { badRequest, HttpError } from './http-error.ts'

/** Կարդում է JSON մարմինը՝ չափի սահմանափակումով։ */
export const readJsonBody = async (req: IncomingMessage, maxBytes: number): Promise<unknown> => {
  const method = req.method ?? 'GET'
  if (method === 'GET' || method === 'HEAD' || method === 'DELETE') return undefined

  const chunks: Buffer[] = []
  let size = 0
  for await (const chunk of req) {
    const buffer = chunk as Buffer
    size += buffer.length
    if (size > maxBytes) {
      throw new HttpError(413, 'PAYLOAD_TOO_LARGE', 'Հարցման չափը չափազանց մեծ է')
    }
    chunks.push(buffer)
  }
  if (size === 0) return undefined

  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'))
  } catch {
    throw badRequest('Անվավեր JSON')
  }
}
