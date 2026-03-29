import { NextRequest } from 'next/server'

export function getClientIp(req: NextRequest) {
  const forwardedFor = req.headers.get('x-forwarded-for')
  if (forwardedFor) {
    return forwardedFor.split(',')[0]?.trim() ?? 'unknown'
  }

  return req.headers.get('x-real-ip') ?? 'unknown'
}

export function isAllowedOrigin(req: NextRequest) {
  const origin = req.headers.get('origin')
  const referer = req.headers.get('referer')

  const configuredOrigins = [
    process.env.NEXT_PUBLIC_SITE_URL,
    ...(process.env.ALLOWED_PUBLIC_ORIGINS?.split(',').map(item => item.trim()) ?? []),
  ].filter(Boolean) as string[]

  if (configuredOrigins.length === 0) {
    return true
  }

  const isAllowed = (value: string | null) => {
    if (!value) return false

    try {
      const normalized = new URL(value).origin
      return configuredOrigins.includes(normalized)
    } catch {
      return false
    }
  }

  return isAllowed(origin) || isAllowed(referer)
}
