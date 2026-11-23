import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

function luminance(color) {
  const channels = color.match(/[a-f0-9]{2}/gi).map(hex => Number.parseInt(hex, 16) / 255)
  const [r, g, b] = channels.map(value => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4)
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

test('los colores semánticos de Turnly mantienen contraste para texto normal', async () => {
  const css = await readFile(new URL('../app/globals.css', import.meta.url), 'utf8')
  const palettes = [...css.matchAll(/:root[^{}]*\{([^{}]*--product-bg:[^{}]*)\}/g)]
  assert.equal(palettes.length, 3)
  for (const [, body] of palettes) {
    const colors = Object.fromEntries([...body.matchAll(/--product-([a-z-]+): (#[a-f0-9]{6});/gi)].map(([, token, color]) => [token, luminance(color)]))
    const pairs = ['bg', 'surface', 'subtle'].flatMap(surface =>
      ['ink', 'muted', 'accent', 'danger', 'warning'].map(ink => [surface, ink]))
    pairs.push(['accent', 'button-ink'])
    for (const [a, b] of pairs) {
      const ratio = (Math.max(colors[a], colors[b]) + 0.05) / (Math.min(colors[a], colors[b]) + 0.05)
      assert.ok(ratio >= 4.5, `${a}/${b}: ${ratio.toFixed(2)}:1`)
    }
  }
})
