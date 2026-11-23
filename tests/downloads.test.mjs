import test from 'node:test'
import assert from 'node:assert/strict'
import { reportCsv, reservationCalendar } from '../lib/downloads.ts'

const fixture = { id:'40000000-0000-4000-8000-000000000001', day:'2026-11-23', time:'23:30', duration:45, business:'Turnly', service:'Corte' }
const now = new Date('2026-11-20T12:00:00Z')

test('calendario genera horas UTC y nunca incluye el enlace de gestión', () => {
  const calendar = reservationCalendar({ ...fixture, token:'not-for-export' }, now)
  assert.match(calendar, /DTSTART:20261124T023000Z\r\nDTEND:20261124T031500Z/)
  assert.doesNotMatch(calendar, /not-for-export|https?:/)
  assert.equal(reservationCalendar({ ...fixture, day:'2026-02-30' }, now), null)
  assert.equal(reservationCalendar({ ...fixture, time:'11:77' }, now), null)
})

test('calendario escapa contenido y pliega líneas Unicode sin romper caracteres', () => {
  const result = reservationCalendar({ ...fixture, service:'Corte\nATTENDEE:separado;, ' + 'é'.repeat(120) }, now)
  assert.match(result, /SUMMARY:Corte\\nATTENDEE:separado\\;\\,/)
  assert.ok(result.split('\r\n').every(line => Buffer.byteLength(line) <= 75))
})

test('CSV escapa fórmulas y conserva valores numéricos', () => {
  assert.equal(reportCsv([['  =1+1', 'servicio "A"', -2, null]]), '\ufeff"\'  =1+1";"servicio ""A""";"-2";""\r\n')
})
