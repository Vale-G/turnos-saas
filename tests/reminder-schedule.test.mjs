import test from 'node:test'
import assert from 'node:assert/strict'
import { reminderDue } from '../lib/reminder-schedule.mjs'
test('recordatorios usan las nueve locales y el día siguiente del negocio',()=>{
  const now=new Date('2026-11-14T12:00:00Z')
  assert.equal(reminderDue('2026-11-15','10:00','America/Argentina/Buenos_Aires',now),true)
  assert.equal(reminderDue('2026-11-14','10:00','America/Argentina/Buenos_Aires',now),false)
  assert.equal(reminderDue('2026-11-15','10:00','UTC',now),false)
  assert.equal(reminderDue('2026-11-15','10:00','invalid',now),false)
})
