interface Bucket {
  count: number
  resetAt: number
}

/** Պարզ in-memory սահմանափակիչ (օր.՝ գաղտնաբառի կոպիտ ընտրության դեմ)։ */
export class RateLimiter {
  private readonly buckets = new Map<string, Bucket>()
  private readonly limit: number
  private readonly windowMs: number

  constructor(limit: number, windowMs: number) {
    this.limit = limit
    this.windowMs = windowMs
  }

  /** Վերադարձնում է false, եթե սահմանաչափը գերազանցված է։ */
  consume(key: string): boolean {
    const now = Date.now()
    const bucket = this.buckets.get(key)
    if (!bucket || bucket.resetAt <= now) {
      this.buckets.set(key, { count: 1, resetAt: now + this.windowMs })
      this.cleanup(now)
      return true
    }
    bucket.count++
    return bucket.count <= this.limit
  }

  reset(key: string): void {
    this.buckets.delete(key)
  }

  private cleanup(now: number) {
    if (this.buckets.size < 1000) return
    for (const [key, bucket] of this.buckets) {
      if (bucket.resetAt <= now) this.buckets.delete(key)
    }
  }
}
