const lineBreak = /\r\n|\r|\n/g
const utc = (date: Date) => date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z')
const textValue = (value: string) => value.replace(/\\/g, '\\\\').replace(lineBreak, '\\n').replace(/[;,]/g, '\\$&')
const utf8 = new TextEncoder()

function fold(line: string) {
  let result = ''
  let size = 0
  for (const character of line) {
    const length = utf8.encode(character).length
    if (size + length > 75) {
      result += '\r\n '
      size = 1
    }
    result += character
    size += length
  }
  return result
}

export function reservationCalendar(event: { id: string; day: string; time: string; duration: number; business: string; service: string }, now = new Date()) {
  if (!/^[\da-f-]{36}$/i.test(event.id) || !/^\d{4}-\d{2}-\d{2}$/.test(event.day)
    || !/^([01]\d|2[0-3]):[0-5]\d$/.test(event.time) || !Number.isInteger(event.duration)
    || event.duration < 1 || event.duration > 1440) return null
  const day = new Date(event.day + 'T00:00:00Z')
  if (!Number.isFinite(day.getTime()) || day.toISOString().slice(0, 10) !== event.day) return null
  // Public booking uses the same Buenos Aires offset in availability and its date labels.
  const start = new Date(`${event.day}T${event.time}:00-03:00`)
  const end = new Date(start.getTime() + event.duration * 60_000)
  return [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Turnly//Reservas//ES', 'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT', 'UID:' + event.id + '@turnly', 'DTSTAMP:' + utc(now),
    'DTSTART:' + utc(start), 'DTEND:' + utc(end),
    'SUMMARY:' + textValue(event.service + ' · ' + event.business), 'END:VEVENT', 'END:VCALENDAR',
  ].map(fold).join('\r\n') + '\r\n'
}

export function reportCsv(rows: (string | number | null)[][]) {
  return '\ufeff' + rows.map(row => row.map(cell => {
    const text = String(cell ?? '')
    const safe = typeof cell === 'string' && /^(?:\s*[=+\-@]|[\t\r\n])/.test(text) ? "'" + text : text
    return '"' + safe.replace(/"/g, '""') + '"'
  }).join(';')).join('\r\n') + '\r\n'
}

export function downloadFile(filename: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }))
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
