const store = new Map<string, { count: number; resetAt: number }>()

function now() {
  return Date.now()
}

function cleanup(expiredBefore: number) {
  for (const [key, value] of store.entries()) {
    if (value.resetAt <= expiredBefore) {
      store.delete(key)
    }
  }
}

export function consumeRateLimit(key: string, limit: number, windowMs: number) {
  const currentTs = now()
  const current = store.get(key)

  if (!current || current.resetAt <= currentTs) {
    store.set(key, { count: 1, resetAt: currentTs + windowMs })
    cleanup(currentTs - windowMs)
    return { ok: true, remaining: limit - 1, resetAt: currentTs + windowMs }
  }

  if (current.count >= limit) {
    return { ok: false, remaining: 0, resetAt: current.resetAt }
  }

  current.count += 1
  store.set(key, current)
  return { ok: true, remaining: Math.max(0, limit - current.count), resetAt: current.resetAt }
}
