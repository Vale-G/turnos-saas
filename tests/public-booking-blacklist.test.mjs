import test from 'node:test'
import assert from 'node:assert/strict'
import { validarListaNegraServidor, consultarListaNegraServidor } from '../lib/reserva-lista-negra.mjs'

test('ausencia de fila permite continuar sin lista negra', () => {
  assert.deepEqual(validarListaNegraServidor(null, '1123456789'), { permitido: true, motivo: null })
})
test('fila presente con valor vacío, null o indefinido rechaza', () => {
  for (const valor of ['', null, undefined]) {
    assert.equal(validarListaNegraServidor({ valor }, '1123456789').motivo, 'configuracion')
  }
})
test('JSON malformado o estructura incorrecta rechaza', () => {
  for (const valor of ['{', '{}', '[1]', 'null']) {
    assert.equal(validarListaNegraServidor({ valor }, '1123456789').permitido, false)
  }
})
test('lista válida vacía permite reservar', () => {
  assert.equal(validarListaNegraServidor({ valor: '[]' }, '1123456789').permitido, true)
})
test('teléfono bloqueado se normaliza y rechaza', () => {
  assert.equal(validarListaNegraServidor({ valor: '["11-2345 6789"]' }, '1123456789').motivo, 'bloqueado')
})
test('lista no vacía exige teléfono', () => {
  assert.equal(validarListaNegraServidor({ valor: '["1123456789"]' }, '').motivo, 'telefono')
})

test('excepción inesperada de Supabase rechaza sin propagar error', async () => {
  const resultado = await consultarListaNegraServidor(async () => { throw new Error('network unavailable') }, '1123456789')
  assert.deepEqual(resultado, { permitido: false, motivo: 'consulta' })
})
test('error explícito de Supabase rechaza', async () => {
  const resultado = await consultarListaNegraServidor(async () => ({ data: null, error: { code: 'PGRST000' } }), '1123456789')
  assert.deepEqual(resultado, { permitido: false, motivo: 'consulta' })
})
test('consulta exitosa preserva validación de lista negra', async () => {
  const resultado = await consultarListaNegraServidor(async () => ({ data: { valor: '["1123456789"]' }, error: null }), '11 2345-6789')
  assert.deepEqual(resultado, { permitido: false, motivo: 'bloqueado' })
})
