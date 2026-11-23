import 'server-only'

export const BA_TIME_ZONE = 'America/Argentina/Buenos_Aires'

export function baDate(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: BA_TIME_ZONE }).format(date)
}

export function baMinutes(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: BA_TIME_ZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date)
  const hour = Number(parts.find((part) => part.type === 'hour')?.value ?? 0) % 24
  const minute = Number(parts.find((part) => part.type === 'minute')?.value ?? 0)
  return hour * 60 + minute
}

export function weekday(date: string) {
  return new Date(`${date}T12:00:00-03:00`).getUTCDay()
}

export { validDate, validHour, validUuid, isRescheduleRequest } from './public-booking-validation.mjs'

export function cleanText(value: unknown, max: number) {
  if (typeof value !== 'string') return ''
  return value.trim().replace(/\s+/g, ' ').slice(0, max)
}
