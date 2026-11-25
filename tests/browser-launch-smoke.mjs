// Loopback only. Use a Chromium headless shell with synthetic public pages.
import assert from 'node:assert/strict'
import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { chromium } from 'playwright'

const evidence = process.env.TURNLY_EVIDENCE_DIR
if (evidence) await mkdir(evidence, { recursive: true })
const browser = await chromium.launch({
  executablePath: process.env.TURNLY_BROWSER || undefined,
  timeout: 45_000,
})
try {
  const origin = 'http://127.0.0.1:3100'
  for (const width of [360, 768, 1280]) {
    const page = await browser.newPage({ viewport: { width, height: 820 }, colorScheme: 'light',
      isMobile: width === 360, hasTouch: width <= 768 })
    await page.goto(origin + '/', { waitUntil: 'load' })
    await page.getByRole('heading', { name: 'Planes', exact: true }).waitFor()
    const appearance = page.getByLabel('Apariencia', { exact: true })
    await page.locator('html[data-product-theme="system"]').waitFor({ state: 'attached' })
    assert.equal(await page.evaluate(size => document.documentElement.scrollWidth <= size, width), true, 'Desborde en portada a ' + width)
    if (width === 1280) {
      await appearance.focus()
      assert.equal(await appearance.evaluate(field => document.activeElement === field), true)
      await appearance.selectOption('dark')
      await page.locator('html[data-product-theme="dark"]').waitFor({ state: 'attached' })
      await page.reload({ waitUntil: 'load' })
      await page.locator('html[data-product-theme="dark"]').waitFor({ state: 'attached' })
      assert.equal(await appearance.inputValue(), 'dark')
    }
    if (evidence) await page.screenshot({ path: join(evidence, `turnly-portada-${width}.png`), fullPage: true })

    for (const [path, id] of [['/recuperar', 'recovery-email'], ['/recuperar/restablecer', 'new-password']]) {
      await page.goto(origin + path, { waitUntil: 'load' })
      await page.locator(`label[for="${id}"]`).waitFor()
      const field = page.locator('#' + id)
      await field.focus()
      const result = await field.evaluate((element, size) => ({
        fits: document.documentElement.scrollWidth <= size,
        focused: document.activeElement === element,
        required: element.required,
      }), width)
      assert.deepEqual(result, { fits: true, focused: true, required: true })
    }
    await page.close()
  }
  const signupPage = await browser.newPage({ viewport: { width: 390, height: 820 } })
  const authOrigin = 'http://127.0.0.1:54321'
  const cors = {
    'access-control-allow-origin': origin,
    'access-control-allow-methods': 'POST, OPTIONS',
    'access-control-allow-headers': '*',
  }
  let signupAttempts = 0
  let onboardingCalls = 0
  await signupPage.route(origin + '/api/onboarding', route => {
    onboardingCalls++
    return route.fulfill({ status: 500 })
  })
  await signupPage.route(origin + '/api/public/slugs/**', route => route.fulfill({ json: { available: true } }))
  await signupPage.route(authOrigin + '/auth/v1/signup?**', route => {
    if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors })
    signupAttempts++
    if (signupAttempts === 1) return route.abort()
    return route.fulfill({ headers: cors,
      json: { id: '10000000-0000-4000-8000-000000000004', aud: 'authenticated', identities: [] } })
  })
  await signupPage.goto(origin + '/registro-negocio', { waitUntil: 'networkidle' })
  await signupPage.getByLabel('Nombre del negocio').fill('Comercio sintético')
  await signupPage.getByLabel('Correo electrónico').fill('registro@example.invalid')
  await signupPage.getByLabel('Contraseña nueva').fill('Sintetica61')
  await signupPage.getByText('Disponible', { exact: true }).waitFor()
  const createAccount = signupPage.getByRole('button', { name: 'Crear mi cuenta gratis' })
  await createAccount.click()
  await signupPage.getByText(/No pudimos crear la cuenta|No pudimos completar el registro/).waitFor()
  const signupRequest = signupPage.waitForRequest(request => request.method() === 'POST' && new URL(request.url()).pathname === '/auth/v1/signup')
  await createAccount.click()
  const submitted = await signupRequest
  assert.equal(new URL(submitted.url()).searchParams.get('redirect_to'), origin + '/auth/callback?next=/onboarding')
  await signupPage.waitForURL(origin + '/login')
  assert.equal(signupAttempts, 2)
  assert.equal(onboardingCalls, 0)
  await signupPage.close()
  console.log('Chromium: callback local de alta, recuperación tras fallo de red y onboarding pendiente hasta confirmar correo.')
  console.log('Chromium: portada y formularios sin desborde a 360, 768 y 1280 px. Preferencia oscura persistente.')
} finally {
  await browser.close()
}
