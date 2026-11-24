import { pathToFileURL } from 'node:url'

export async function run({ originValue, secret, request = fetch, output = console }) {
  const origin = new URL(originValue ?? '')
  if (
    origin.protocol !== 'https:' || origin.username || origin.password ||
    origin.pathname !== '/' || origin.search || origin.hash ||
    !secret?.trim()
  ) {
    throw new Error('Invalid worker configuration')
  }

  const response = await request(new URL('/api/cron/billing', origin), {
    method: 'POST',
    headers: { authorization: 'Bearer ' + secret },
    redirect: 'error',
    signal: AbortSignal.timeout(70_000),
  })
  if (response.status !== 200) {
    output.error('Billing worker returned HTTP %d', response.status)
    return 1
  }

  const counts = await response.json()
  const { processed, failed, review, deferred } = counts
  if (![processed, failed, review, deferred].every(n => Number.isSafeInteger(n) && n >= 0)) {
    throw new Error('Unexpected worker response')
  }
  output.log(JSON.stringify({ processed, failed, review, deferred }))
  return failed || review ? 1 : 0
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    process.exitCode = await run({
      originValue: process.env.TURNLY_BILLING_WORKER_ORIGIN,
      secret: process.env.TURNLY_SAAS_WORKER_SECRET,
    })
  } catch {
    console.error('Billing worker request failed or is not configured')
    process.exitCode = 1
  }
}
