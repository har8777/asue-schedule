import type { RequestContext, RouteHandler } from './request-context.ts'

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

interface RouteDefinition {
  method: HttpMethod
  segments: string[]
  handlers: RouteHandler[]
}

export interface RouteMatch {
  handlers: RouteHandler[]
  params: Record<string, string>
}

const splitPath = (path: string): string[] => path.split('/').filter(Boolean)

/**
 * Թեթև router՝ `:param` հատվածներով։ Յուրաքանչյուր route ունի middleware-ների
 * շղթա (guard-եր), որոնց վերջինը հիմնական մշակիչն է։
 */
export class Router {
  private readonly routes: RouteDefinition[] = []
  private readonly prefix: string

  constructor(prefix = '') {
    this.prefix = prefix
  }

  get(path: string, ...handlers: RouteHandler[]) {
    return this.add('GET', path, handlers)
  }

  post(path: string, ...handlers: RouteHandler[]) {
    return this.add('POST', path, handlers)
  }

  put(path: string, ...handlers: RouteHandler[]) {
    return this.add('PUT', path, handlers)
  }

  patch(path: string, ...handlers: RouteHandler[]) {
    return this.add('PATCH', path, handlers)
  }

  delete(path: string, ...handlers: RouteHandler[]) {
    return this.add('DELETE', path, handlers)
  }

  /** Միացնում է մեկ այլ router-ի route-երը (մոդուլների գրանցման համար)։ */
  use(child: Router) {
    for (const route of child.routes) {
      this.routes.push({ ...route, segments: [...splitPath(this.prefix), ...route.segments] })
    }
    return this
  }

  match(method: string, path: string): RouteMatch | null {
    const pathSegments = splitPath(path)
    for (const route of this.routes) {
      if (route.method !== method || route.segments.length !== pathSegments.length) continue
      const params: Record<string, string> = {}
      const isMatch = route.segments.every((segment, index) => {
        const actual = pathSegments[index]
        if (segment.startsWith(':')) {
          params[segment.slice(1)] = decodeURIComponent(actual)
          return true
        }
        return segment === actual
      })
      if (isMatch) return { handlers: route.handlers, params }
    }
    return null
  }

  hasPath(path: string): boolean {
    const pathSegments = splitPath(path)
    return this.routes.some(
      (route) =>
        route.segments.length === pathSegments.length &&
        route.segments.every((segment, index) => segment.startsWith(':') || segment === pathSegments[index]),
    )
  }

  private add(method: HttpMethod, path: string, handlers: RouteHandler[]) {
    this.routes.push({ method, segments: [...splitPath(this.prefix), ...splitPath(path)], handlers })
    return this
  }
}

export const runHandlers = async (handlers: RouteHandler[], ctx: RequestContext): Promise<unknown> => {
  let result: unknown
  for (const handler of handlers) {
    result = await handler(ctx)
  }
  return result
}
