import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const dashboard = new URL('../app/(dashboard)/dashboard/page.tsx', import.meta.url)
const upgrade = new URL('../app/upgrade/page.tsx', import.meta.url)
const settings = new URL('../app/ajustes/page.tsx', import.meta.url)
const tenantPages = [
  dashboard,
  new URL('../app/bloqueos/page.tsx', import.meta.url),
  new URL('../app/informes/page.tsx', import.meta.url),
  new URL('../app/servicios/page.tsx', import.meta.url),
  new URL('../app/turnos/page.tsx', import.meta.url),
]

test('el dashboard no solicita columnas sensibles mediante select wildcard', async () => {
  const source = await readFile(dashboard, 'utf8')
  assert.doesNotMatch(source, /from\(['"]negocio['"]\)\.select\(['"]\*['"]\)/)
  assert.match(source, /select\(['"]id,nombre,logo_url,slug['"]\)/)
})

test('el panel conserva el logo del comercio y toma la apariencia de Turnly', async () => {
  const source = await readFile(dashboard, 'utf8')
  const reserva = await readFile(new URL('../app/reservar/[slug]/page.tsx', import.meta.url), 'utf8')
  assert.match(source, /--product-bg/)
  assert.match(source, /negocio\.logo_url/)
  assert.doesNotMatch(source, /getAppearance|getThemeColor/)
  assert.match(reserva, /getAppearance/)
  assert.match(reserva, /data-mode=\{appearance\.visualMode\}/)
  assert.match(source, /Panel de gestión/)
  assert.doesNotMatch(source, /Elite Dashboard|Modo Dios|>DIOS</)
  assert.doesNotMatch(source, /wa\.me\/5491123456789/)
})

test('las pantallas multi-negocio no solicitan todos los campos de negocio o roles', async () => {
  for (const page of tenantPages) {
    const source = await readFile(page, 'utf8')
    assert.doesNotMatch(source, /from\(['"]negocio['"]\)\.select\(['"]\*['"]\)/)
    assert.doesNotMatch(source, /from\(['"]adminrol['"]\)\.select\(['"]\*['"]\)/)
  }
})

test('la comparación de planes no anuncia automatizaciones inexistentes', async () => {
  const source = await readFile(upgrade, 'utf8')
  assert.doesNotMatch(source, /Recordatorios automaticos|WhatsApp al confirmar|Agenda y cobros/)
  assert.match(source, /Control de caja/)
  assert.match(source, /Informes avanzados/)
})

test('ajustes explica el requisito de plan antes de iniciar Mercado Pago', async () => {
  const source = await readFile(settings, 'utf8')
  assert.match(source, /credential\.planRequired/)
  assert.match(source, /Disponible con Turnly Pro/)
  assert.match(source, /\/upgrade\?feature=mercadopago/)
})
