import test from 'node:test'
import assert from 'node:assert/strict'
import { generarHorariosDisponibles } from '../lib/reserva-disponibilidad.mjs'

const base = {
  apertura: '09:00:00',
  cierre: '12:00:00',
  duracion: 60,
}

test('ofrece intervalos completos dentro de apertura y cierre', () => {
  assert.deepEqual(generarHorariosDisponibles(base), ['09:00', '10:00', '11:00'])
})

test('no ofrece turnos que terminan después del cierre', () => {
  assert.deepEqual(generarHorariosDisponibles({ ...base, cierre: '11:30' }), ['09:00', '10:00'])
})

test('rechaza duración cero, negativa, decimal o no numérica sin bloquear la interfaz', () => {
  for (const duracion of [0, -30, 1.5, NaN]) {
    assert.deepEqual(generarHorariosDisponibles({ ...base, duracion }), [])
  }
})

test('rechaza horarios inválidos o jornadas invertidas', () => {
  assert.deepEqual(generarHorariosDisponibles({ ...base, apertura: '25:00' }), [])
  assert.deepEqual(generarHorariosDisponibles({ ...base, cierre: '08:00' }), [])
  assert.deepEqual(generarHorariosDisponibles({ ...base, cierre: '09:00' }), [])
})

test('excluye todo intervalo que se superpone con un bloqueo parcial', () => {
  assert.deepEqual(
    generarHorariosDisponibles({
      ...base,
      bloqueos: [{ hora_inicio: '09:30:00', hora_fin: '10:15:00' }],
    }),
    ['11:00'],
  )
})

test('excluye inicios ocupados incluso dentro de un intervalo propuesto', () => {
  assert.deepEqual(
    generarHorariosDisponibles({ ...base, ocupados: ['09:30:00', '11:00:00'] }),
    ['10:00'],
  )
})

test('respeta el límite horario para reservas del mismo día', () => {
  assert.deepEqual(generarHorariosDisponibles({ ...base, minLimite: 10 * 60 + 15 }), ['11:00'])
})

test('ignora bloqueos inválidos sin impedir el resto de horarios', () => {
  assert.deepEqual(
    generarHorariosDisponibles({
      ...base,
      bloqueos: [{ hora_inicio: 'invalido', hora_fin: '10:00' }],
    }),
    ['09:00', '10:00', '11:00'],
  )
})
