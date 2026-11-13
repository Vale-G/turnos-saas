import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const dashboard = new URL('../app/(dashboard)/dashboard/page.tsx', import.meta.url)
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
  assert.match(source, /select\(['"]id,nombre,tema,logo_url,suscripcion_tipo,slug,trial_hasta['"]\)/)
})

test('las pantallas multi-negocio no solicitan todos los campos de negocio o roles', async () => {
  for (const page of tenantPages) {
    const source = await readFile(page, 'utf8')
    assert.doesNotMatch(source, /from\(['"]negocio['"]\)\.select\(['"]\*['"]\)/)
    assert.doesNotMatch(source, /from\(['"]adminrol['"]\)\.select\(['"]\*['"]\)/)
  }
})
