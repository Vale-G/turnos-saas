import assert from 'node:assert/strict'
import test from 'node:test'
import { reportFor } from '../lib/owner-report.ts'

const service = { id: 's', nombre: 'Consulta', precio: 100 }
const rows = ['completado', 'pendiente', 'confirmado', 'cancelado'].map(estado => ({
  estado, servicio: [service], staff: { id: 'a', nombre: 'Ana' },
}))
rows.push({ estado: 'completado', servicio: null, staff: { id: 'b', nombre: 'Ana' } })

test('el filtro distingue profesionales homónimos y calcula cancelaciones sobre todas las reservas', () => {
  const report = reportFor(rows, 'a')
  assert.deepEqual([report.total, report.completed, report.cancelled, report.open, report.estimated, report.cancellationRate], [4,1,1,2,100,25])
  assert.equal(reportFor(rows, '').team.length, 2)
  assert.equal(reportFor(rows, 'b').estimated, 0)
})

test('informes vacíos y turnos sin asignación', () => {
  assert.equal(reportFor([], '').cancellationRate, null)
  assert.equal(reportFor([{ estado: 'completado', servicio: service, staff: null }], 'unassigned').estimated, 100)
})
