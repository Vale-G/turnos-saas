export const BUSINESS_TIME_ZONE = 'America/Argentina/Buenos_Aires'

export function todayInTimeZone(timeZone = BUSINESS_TIME_ZONE, now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now)
}

export function addDaysISO(iso, days) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso)
  if (!match || !Number.isInteger(days)) throw new Error('Fecha ISO inválida')
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]) + days))
  return date.toISOString().slice(0, 10)
}

export function mondayOfISOWeek(iso) {
  const date = new Date(`${iso}T12:00:00Z`)
  if (Number.isNaN(date.getTime())) throw new Error('Fecha ISO inválida')
  const offset = (date.getUTCDay() + 6) % 7
  return addDaysISO(iso, -offset)
}
