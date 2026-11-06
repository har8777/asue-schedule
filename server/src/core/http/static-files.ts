import { createReadStream, existsSync, statSync } from 'node:fs'
import type { ServerResponse } from 'node:http'
import { extname, join, normalize, sep } from 'node:path'

const CONTENT_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
}

/**
 * Մատուցում է կառուցված frontend-ը։ Անհայտ ճանապարհների դեպքում վերադարձնում է
 * index.html (SPA fallback), որպեսզի React Router-ը աշխատի։
 */
export class StaticFiles {
  private readonly rootDir: string
  readonly isEnabled: boolean

  constructor(rootDir: string) {
    this.rootDir = normalize(rootDir)
    this.isEnabled = existsSync(join(this.rootDir, 'index.html'))
  }

  serve(path: string, res: ServerResponse): void {
    const filePath = this.resolveFile(path) ?? join(this.rootDir, 'index.html')
    const extension = extname(filePath)
    const isHashedAsset = filePath.includes(`${sep}assets${sep}`)
    const isAlwaysFresh = extension === '.html' || filePath.endsWith('sw.js') || extension === '.webmanifest'

    res.writeHead(200, {
      'Content-Type': CONTENT_TYPES[extension] ?? 'application/octet-stream',
      'Cache-Control': isHashedAsset
        ? 'public, max-age=31536000, immutable'
        : isAlwaysFresh
          ? 'no-cache'
          : 'public, max-age=3600',
    })
    createReadStream(filePath).pipe(res)
  }

  private resolveFile(path: string): string | null {
    const safePath = normalize(decodeURIComponent(path)).replace(/^(\.\.[/\\])+/, '')
    const candidate = join(this.rootDir, safePath)
    if (!candidate.startsWith(this.rootDir)) return null
    if (existsSync(candidate) && statSync(candidate).isFile()) return candidate
    return null
  }
}
