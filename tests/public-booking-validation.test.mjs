import test from 'node:test'
import assert from 'node:assert/strict'
import { isRescheduleRequest, validDate } from '../lib/server/public-booking-validation.mjs'

test('las fechas imposibles no se normalizan al mes siguiente', () => {
  assert.equal(validDate('2026-02-29'), false)
  assert.equal(validDate('2026-04-31'), false)
  assert.equal(validDate('2028-02-29'), true)
})

test('una reprogramación solo acepta objetos con una selección válida', () => {
  const request = { fecha: '2026-12-02', hora: '10:30', staffId: '40000000-0000-4000-8000-000000000001' }
  assert.equal(isRescheduleRequest(request), true)
  for (const body of [null, [], 'texto', 12, {}, { ...request, hora: '24:30' }, { ...request, staffId: 'incorrecto' }]) {
    assert.equal(isRescheduleRequest(body), false)
  }
})
