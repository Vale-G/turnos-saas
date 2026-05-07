import { NextRequest } from 'next/server'

type RateLimitEntry = {
  count: number
  resetAt: number
}

type RateLimitOptions = {
  limit: number
  windowMs: number
}

export type RateLimitResult = {
  success: boolean
  limit: number
  remaining: number
  reset: number
  retryAfter: number
}

const store = new Map<string, RateLimitEntry>()

function nowMs() {
  return Date.now()
}

function cleanupExpiredEntries(currentTime: number) {
  for (const [key, entry] of store.entries()) {
    if (entry.resetAt <= currentTime) {
      store.delete(key)
    }
  }
}

export function getClientIp(request: NextRequest | Request): string {
  const directIp = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
  if (directIp) return directIp

  const realIp = request.headers.get('x-real-ip')?.trim()
  if (realIp) return realIp

  const cfIp = request.headers.get('cf-connecting-ip')?.trim()
  if (cfIp) return cfIp

  return 'unknown'
}

export function createRateLimiter(options: RateLimitOptions) {
  const { limit, windowMs } = options

  return {
    check(identifier: string): RateLimitResult {
      const currentTime = nowMs()
      cleanupExpiredEntries(currentTime)

      const existing = store.get(identifier)

      if (!existing || existing.resetAt <= currentTime) {
        const newEntry: RateLimitEntry = {
          count: 1,
          resetAt: currentTime + windowMs,
        }
        store.set(identifier, newEntry)

        return {
          success: true,
          limit,
          remaining: Math.max(0, limit - 1),
          reset: newEntry.resetAt,
          retryAfter: Math.ceil(windowMs / 1000),
        }
      }

      existing.count += 1
      store.set(identifier, existing)

      const remaining = Math.max(0, limit - existing.count)
      const success = existing.count <= limit
      const retryAfter = Math.max(
        0,
        Math.ceil((existing.resetAt - currentTime) / 1000)
      )

      return {
        success,
        limit,
        remaining,
        reset: existing.resetAt,
        retryAfter,
      }
    },
  }
}

export function rateLimitByIp(
  request: NextRequest | Request,
  options: RateLimitOptions,
  scope = 'global'
): RateLimitResult {
  const ip = getClientIp(request)
  const limiter = createRateLimiter(options)
  return limiter.check(`${scope}:${ip}`)
}
