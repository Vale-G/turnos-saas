type RateLimitResult = {
  ok: boolean
  remaining: number
  resetAt: number
}

const memoryStore = new Map<string, { count: number; resetAt: number }>()

function now() {
  return Date.now()
}

function cleanup(expiredBefore: number) {
  for (const [key, value] of memoryStore.entries()) {
    if (value.resetAt <= expiredBefore) {
      memoryStore.delete(key)
    }
  }
}

function consumeMemoryRateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const currentTs = now()
  const current = memoryStore.get(key)

  if (!current || current.resetAt <= currentTs) {
    memoryStore.set(key, { count: 1, resetAt: currentTs + windowMs })
    cleanup(currentTs - windowMs)
    return { ok: true, remaining: limit - 1, resetAt: currentTs + windowMs }
  }

  if (current.count >= limit) {
    return { ok: false, remaining: 0, resetAt: current.resetAt }
  }

  current.count += 1
  memoryStore.set(key, current)
  return { ok: true, remaining: Math.max(0, limit - current.count), resetAt: current.resetAt }
}

async function consumeRedisRateLimit(key: string, limit: number, windowMs: number): Promise<RateLimitResult | null> {
  const redisUrl = process.env.UPSTASH_REDIS_REST_URL
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN

  if (!redisUrl || !redisToken) {
    return null
  }

  const currentTs = now()
  const bucket = Math.floor(currentTs / windowMs)
  const bucketKey = `ratelimit:${key}:${bucket}`
  const resetAt = (bucket + 1) * windowMs

  try {
    const pipelineRes = await fetch(`${redisUrl}/pipeline`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${redisToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([
        ['INCR', bucketKey],
        ['PEXPIRE', bucketKey, windowMs],
      ]),
      cache: 'no-store',
    })

    if (!pipelineRes.ok) {
      return null
    }

    const json = await pipelineRes.json() as Array<{ result?: number }>
    const count = Number(json?.[0]?.result ?? 1)
    const remaining = Math.max(0, limit - count)

    return {
      ok: count <= limit,
      remaining,
      resetAt,
    }
  } catch {
    return null
  }
}

export async function consumeRateLimit(key: string, limit: number, windowMs: number) {
  const redisResult = await consumeRedisRateLimit(key, limit, windowMs)
  if (redisResult) {
    return redisResult
  }

  return consumeMemoryRateLimit(key, limit, windowMs)
}
