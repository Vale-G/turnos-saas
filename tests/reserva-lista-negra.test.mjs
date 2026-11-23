import test from 'node:test'
import assert from 'node:assert/strict'
import { parsearListaNegra, telefonoBloqueado, verificarListaNegra } from '../lib/reserva-lista-negra.mjs'

test('rechaza JSON malformado sin excepción', () => {
  assert.deepEqual(parsearListaNegra('{'), { ok: false, telefonos: [] })
})

test('rechaza estructuras y entradas inválidas', () => {
  for (const valor of [null, undefined, '{}', 'null', '42', '[123]', '["123",null]']) {
    assert.equal(parsearListaNegra(valor).ok, false)
  }
})

test('acepta lista vacía y teléfonos normalizados', () => {
  assert.deepEqual(parsearListaNegra('[]'), { ok: true, telefonos: [] })
  assert.deepEqual(parsearListaNegra('["+54 11-2345", "236 555"]'), { ok: true, telefonos: ['54112345', '236555'] })
})

test('compara teléfonos normalizados y evita coincidencias parciales', () => {
  const { telefonos } = parsearListaNegra('["+54 11-2345"]')
  assert.equal(telefonoBloqueado(telefonos, '+54 (11) 2345'), true)
  assert.equal(telefonoBloqueado(telefonos, '112345'), false)
})

test('rechaza entrada de verificación inválida de forma conservadora', () => {
  assert.equal(telefonoBloqueado(null, '123'), true)
  assert.equal(telefonoBloqueado(['123'], null), true)
})


test('rechaza excepciones de red sin autorizar la reserva', async () => {
  const resultado = await verificarListaNegra(async () => { throw new Error('network') }, '123')
  assert.deepEqual(resultado, { permitido: false, motivo: 'consulta' })
})

test('rechaza errores de Supabase y configuración corrupta', async () => {
  assert.equal((await verificarListaNegra(async () => ({ data: null, error: { message: 'offline' } }), '123')).permitido, false)
  assert.equal((await verificarListaNegra(async () => ({ data: { valor: '{' }, error: null }), '123')).motivo, 'configuracion')
})

test('rechaza teléfono ausente con lista no vacía y teléfonos bloqueados', async () => {
  const consultar = async () => ({ data: { valor: '["123"]' }, error: null })
  assert.equal((await verificarListaNegra(consultar, '')).motivo, 'telefono')
  assert.equal((await verificarListaNegra(consultar, '123')).motivo, 'bloqueado')
  assert.equal((await verificarListaNegra(consultar, '456')).permitido, true)
})

test('permite reserva si no existe lista negra o está vacía', async () => {
  assert.equal((await verificarListaNegra(async () => ({ data: null, error: null }), '')).permitido, true)
  assert.equal((await verificarListaNegra(async () => ({ data: { valor: '[]' }, error: null }), '')).permitido, true)
})
