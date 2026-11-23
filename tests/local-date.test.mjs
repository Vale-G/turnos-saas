import test from 'node:test'
import assert from 'node:assert/strict'
import { addDaysISO, mondayOfISOWeek, todayInTimeZone } from '../lib/local-date.mjs'

test('la fecha comercial respeta Buenos Aires cuando UTC ya cambió de día', () => {
  const instant = new Date('2026-11-14T01:30:00Z')
  assert.equal(todayInTimeZone('America/Argentina/Buenos_Aires', instant), '2026-11-13')
})

test('mueve fechas y semanas sin depender de la zona horaria del servidor', () => {
  assert.equal(addDaysISO('2026-11-30', 1), '2026-12-01')
  assert.equal(addDaysISO('2026-03-01', -1), '2026-02-28')
  assert.equal(mondayOfISOWeek('2026-11-13'), '2026-11-09')
})
