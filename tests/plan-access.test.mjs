import test from 'node:test'
import assert from 'node:assert/strict'
import { hasProAccess } from '../lib/server/plan-access.ts'

const now = new Date('2026-11-13T18:00:00.000Z')

test('Pro conserva acceso a las funciones comerciales', () => {
  assert.equal(hasProAccess({ suscripcion_tipo: 'pro' }, now), true)
})

test('Trial solo conserva acceso mientras no venció', () => {
  assert.equal(hasProAccess({ suscripcion_tipo: 'trial', trial_hasta: '2026-11-14T18:00:00.000Z' }, now), true)
  assert.equal(hasProAccess({ suscripcion_tipo: 'trial', trial_hasta: '2026-11-12T18:00:00.000Z' }, now), false)
  assert.equal(hasProAccess({ suscripcion_tipo: 'trial', trial_hasta: null }, now), false)
})

test('Básico y valores desconocidos no obtienen funciones Pro', () => {
  assert.equal(hasProAccess({ suscripcion_tipo: 'basico' }, now), false)
  assert.equal(hasProAccess({ suscripcion_tipo: 'normal' }, now), false)
  assert.equal(hasProAccess({ suscripcion_tipo: 'inventado' }, now), false)
})
