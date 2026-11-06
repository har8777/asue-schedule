/**
 * Կանխատեսելի HTTP սխալ, որը router-ը վերածում է JSON պատասխանի։
 */
export class HttpError extends Error {
  readonly status: number
  readonly code: string
  readonly details?: unknown

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message)
    this.status = status
    this.code = code
    this.details = details
  }
}

export const badRequest = (message: string, details?: unknown) =>
  new HttpError(400, 'BAD_REQUEST', message, details)

export const unauthorized = (message = 'Անհրաժեշտ է մուտք գործել համակարգ') =>
  new HttpError(401, 'UNAUTHORIZED', message)

export const forbidden = (message = 'Այս գործողության իրավունքը չունեք') =>
  new HttpError(403, 'FORBIDDEN', message)

export const notFound = (message = 'Չի գտնվել') => new HttpError(404, 'NOT_FOUND', message)

export const conflict = (message: string, details?: unknown) =>
  new HttpError(409, 'CONFLICT', message, details)

/** Լսարանը զբաղված է. այս բախումը հնարավոր չէ շրջանցել «force»-ով։ */
export const roomOccupied = (details: unknown) =>
  new HttpError(409, 'ROOM_OCCUPIED', 'Լսարանը զբաղված է այդ ժամին։ Ընտրեք այլ լսարան։', details)

export const tooManyRequests = (message: string) => new HttpError(429, 'TOO_MANY_REQUESTS', message)
