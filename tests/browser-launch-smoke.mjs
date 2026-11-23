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
  console.log('Chromium: portada y formularios sin desborde a 360, 768 y 1280 px. Preferencia oscura persistente.')
} finally {
  await browser.close()
}
