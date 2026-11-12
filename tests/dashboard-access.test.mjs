import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const dashboard = new URL('../app/(dashboard)/dashboard/page.tsx', import.meta.url)

test('el dashboard no solicita columnas sensibles mediante select wildcard', async () => {
  const source = await readFile(dashboard, 'utf8')
  assert.doesNotMatch(source, /from\(['"]negocio['"]\)\.select\(['"]\*['"]\)/)
  assert.match(source, /select\(['"]id,nombre,tema,logo_url,suscripcion_tipo,slug,trial_hasta['"]\)/)
})
