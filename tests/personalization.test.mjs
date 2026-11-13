import assert from 'node:assert/strict'
import { test } from 'node:test'
import { getAppearance, normalizePersonalization } from '../lib/personalization.mjs'

test('normaliza valores desconocidos sin permitir estilos arbitrarios', () => {
  assert.deepEqual(normalizePersonalization({
    businessType: 'inyectado',
    visualStyle: '<script>',
    visualMode: 'neon',
  }), { businessType: 'general', visualStyle: 'sereno', visualMode: 'oscuro' })
})

test('conserva una personalización válida', () => {
  assert.deepEqual(normalizePersonalization({
    businessType: 'salud',
    visualStyle: 'minimal',
    visualMode: 'claro',
  }), { businessType: 'salud', visualStyle: 'minimal', visualMode: 'claro' })
})

test('genera tokens legibles para modo claro y oscuro', () => {
  const light = getAppearance({ visualMode: 'claro', visualStyle: 'editorial' })
  const dark = getAppearance({ visualMode: 'oscuro', visualStyle: 'audaz' })
  assert.equal(light.background, '#f8fafc')
  assert.equal(light.foreground, '#0f172a')
  assert.equal(light.radius, '0.5rem')
  assert.equal(dark.background, '#020617')
  assert.equal(dark.foreground, '#f8fafc')
  assert.equal(dark.radius, '2.75rem')
})
