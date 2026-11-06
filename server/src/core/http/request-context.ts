import type { IncomingMessage, ServerResponse } from 'node:http'
import type { AuthUser } from '../../modules/auth/auth.types.ts'

export interface RequestContext {
  readonly req: IncomingMessage
  readonly res: ServerResponse
  readonly method: string
  readonly path: string
  readonly query: URLSearchParams
  readonly ip: string
  params: Record<string, string>
  body: unknown
  user: AuthUser | null
}

/** Մշակիչը կարող է վերադարձնել տվյալ (JSON 200), HttpResult կամ ոչինչ (204)։ */
export type RouteHandler = (ctx: RequestContext) => unknown | Promise<unknown>

export class HttpResult {
  readonly status: number
  readonly body: unknown
  readonly headers: Record<string, string>

  constructor(status: number, body: unknown, headers: Record<string, string> = {}) {
    this.status = status
    this.body = body
    this.headers = headers
  }

  static created(body: unknown) {
    return new HttpResult(201, body)
  }

  static file(content: string, fileName: string, contentType: string) {
    return new HttpResult(200, content, {
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename="${fileName}"`,
    })
  }
}
