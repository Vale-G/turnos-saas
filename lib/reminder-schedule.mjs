export function reminderDue(date, hour, timeZone, now = new Date()) {
  try {
    const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone, year:'numeric', month:'2-digit', day:'2-digit', hour:'2-digit', hourCycle:'h23' }).formatToParts(now).map(p => [p.type,p.value]))
    const localDate = `${parts.year}-${parts.month}-${parts.day}`
    const tomorrow = new Date(`${localDate}T12:00:00Z`)
    tomorrow.setUTCDate(tomorrow.getUTCDate()+1)
    return Number(parts.hour) === 9 && date === tomorrow.toISOString().slice(0,10) && /^\d{2}:\d{2}/.test(hour)
  } catch { return false }
}
