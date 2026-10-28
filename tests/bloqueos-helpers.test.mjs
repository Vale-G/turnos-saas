import test from 'node:test'
import assert from 'node:assert/strict'
import { esRangoHorarioValido, getStaffNombre } from '../lib/bloqueos-helpers.mjs'

test('obtiene el nombre de staff cuando la relación llega como objeto', () => {
  assert.equal(getStaffNombre({ nombre: 'Ana' }), 'Ana')
})

test('obtiene el primer nombre cuando la relación llega como array', () => {
  assert.equal(getStaffNombre([{ nombre: 'Ana' }, { nombre: 'Luis' }]), 'Ana')
})

test('devuelve undefined para relación vacía o nula', () => {
  assert.equal(getStaffNombre([]), undefined)
  assert.equal(getStaffNombre(null), undefined)
  assert.equal(getStaffNombre(undefined), undefined)
})

test('acepta un rango horario válido', () => {
  assert.equal(esRangoHorarioValido('09:00', '10:00'), true)
})

test('rechaza horas iguales, invertidas o con formato inválido', () => {
  assert.equal(esRangoHorarioValido('09:00', '09:00'), false)
  assert.equal(esRangoHorarioValido('10:00', '09:00'), false)
  assert.equal(esRangoHorarioValido('25:00', '26:00'), false)
  assert.equal(esRangoHorarioValido('nueve', '10:00'), false)
})
