import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http'
import { readJsonBody } from './body-parser.ts'
import { HttpError } from './http-error.ts'
import { HttpResult, type RequestContext } from './request-context.ts'
import { runHandlers, type Router } from './router.ts'
import type { StaticFiles } from './static-files.ts'

export interface HttpServerOptions {
  router: Router
  apiPrefix: string
  corsOrigins: readonly string[]
  maxBodyBytes: number
  staticFiles: StaticFiles
  isProduction: boolean
  trustProxy: boolean
}

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-Frame-Options': 'DENY',
}

const sendJson = (res: ServerResponse, status: number, body: unknown, headers: Record<string, string> = {}) => {
  const payload = JSON.stringify(body)
  res.writeHead(status, {
    ...SECURITY_HEADERS,
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    ...headers,
  })
  res.end(payload)
}

const getClientIp = (req: IncomingMessage, trustProxy: boolean): string => {
  if (!trustProxy) return req.socket.remoteAddress || 'unknown'
  const forwarded = req.headers['x-forwarded-for']
  const first = Array.isArray(forwarded) ? forwarded[0] : forwarded?.split(',')[0]
  return first?.trim() || req.socket.remoteAddress || 'unknown'
}

export const createHttpServer = (options: HttpServerOptions): Server => {
  const { router, apiPrefix, corsOrigins, maxBodyBytes, staticFiles, isProduction, trustProxy } = options

  const applyCors = (req: IncomingMessage, res: ServerResponse) => {
    const origin = req.headers.origin
    if (origin && (corsOrigins.includes(origin) || corsOrigins.includes('*'))) {
      res.setHeader('Access-Control-Allow-Origin', origin)
      res.setHeader('Vary', 'Origin')
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS')
      res.setHeader('Access-Control-Max-Age', '600')
    }
  }

  const handleApi = async (req: IncomingMessage, res: ServerResponse, url: URL) => {
    const method = req.method ?? 'GET'
    const match = router.match(method, url.pathname)
    if (!match) {
      const status = router.hasPath(url.pathname) ? 405 : 404
      sendJson(res, status, { code: status === 405 ? 'METHOD_NOT_ALLOWED' : 'NOT_FOUND', message: 'Ճանապարհը չի գտնվել' })
      return
    }

    const ctx: RequestContext = {
      req,
      res,
      method,
      path: url.pathname,
      query: url.searchParams,
      ip: getClientIp(req, trustProxy),
      params: match.params,
      body: await readJsonBody(req, maxBodyBytes),
      user: null,
    }

    const result = await runHandlers(match.handlers, ctx)
    if (result instanceof HttpResult) {
      if (typeof result.body === 'string') {
        res.writeHead(result.status, { ...SECURITY_HEADERS, ...result.headers })
        res.end(result.body)
      } else {
        sendJson(res, result.status, result.body, result.headers)
      }
      return
    }
    if (result === undefined) {
      res.writeHead(204, SECURITY_HEADERS)
      res.end()
      return
    }
    sendJson(res, 200, result)
  }

  return createServer(async (req, res) => {
    const url = new URL(req.url ?? '/', 'http://localhost')
    applyCors(req, res)

    if (req.method === 'OPTIONS') {
      res.writeHead(204)
      res.end()
      return
    }

    try {
      if (url.pathname.startsWith(apiPrefix)) {
        await handleApi(req, res, url)
        return
      }
      if (staticFiles.isEnabled && (req.method === 'GET' || req.method === 'HEAD')) {
        staticFiles.serve(url.pathname, res)
        return
      }
      sendJson(res, 404, { code: 'NOT_FOUND', message: 'Չի գտնվել' })
    } catch (error) {
      if (error instanceof HttpError) {
        sendJson(res, error.status, { code: error.code, message: error.message, details: error.details })
        return
      }
      console.error('[HTTP] Չնախատեսված սխալ', error)
      sendJson(res, 500, {
        code: 'INTERNAL_ERROR',
        message: 'Սերվերի ներքին սխալ',
        details: isProduction ? undefined : String(error),
      })
    }
  })
}
