// Loopback only. The browser exercises public UI without credentials or external messages.
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { once } from 'node:events'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { setTimeout as pause } from 'node:timers/promises'

const binary = process.env.TURNLY_BROWSER
assert.ok(binary, 'TURNLY_BROWSER must point to a local Chromium-compatible binary')
const profile = await mkdtemp(join(tmpdir(), 'turnly-browser-'))
const processHandle = spawn(binary, [
  '--headless', '--no-sandbox', '--disable-dev-shm-usage', '--disable-background-networking',
  '--no-first-run', '--remote-debugging-pipe', '--user-data-dir=' + profile, 'about:blank',
], { stdio: ['ignore', 'ignore', 'pipe', 'pipe', 'pipe'] })
let browserError = ''
processHandle.stderr.setEncoding('utf8').on('data', chunk => { browserError = (browserError + chunk).slice(-3000) })
let exited = false
processHandle.once('error', () => { exited = true })
processHandle.once('exit', () => { exited = true })

async function until(action, message) {
  for (let i = 0; i < 80; i++) {
    const value = await action()
    if (value) return value
    if (exited) break
    await pause(100)
  }
  throw new Error(message)
}

try {
  const incoming = processHandle.stdio[4]
  const outgoing = processHandle.stdio[3]
  incoming.setEncoding('utf8')
  let sequence = 0
  let buffer = ''
  const pending = new Map()
  incoming.on('data', chunk => {
    buffer += chunk
    const messages = buffer.split('\0')
    buffer = messages.pop()
    for (const raw of messages) {
      if (!raw) continue
      const message = JSON.parse(raw)
      pending.get(message.id)?.(message)
    }
  })
  outgoing.on('error', () => {})
  function command(method, params = {}, sessionId) {
    const id = ++sequence
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        pending.delete(id)
        reject(new Error(method + ' no respondió. Chromium: ' + browserError))
      }, 10_000)
      pending.set(id, message => {
        pending.delete(id)
        clearTimeout(timeout)
        if (message.error) reject(new Error(method + ': ' + message.error.message))
        else resolve(message.result)
      })
      outgoing.write(JSON.stringify({ id, method, params, sessionId }) + '\0')
    })
  }

  const { targetInfos } = await command('Target.getTargets')
  const target = targetInfos.find(page => page.type === 'page')
  assert.ok(target)
  const { sessionId } = await command('Target.attachToTarget', { targetId: target.targetId, flatten: true })
  const pageCommand = (method, params) => command(method, params, sessionId)

  const origin = 'http://127.0.0.1:3100'
  await pageCommand('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: 'light' }] })
  async function evaluate(expression) {
    const response = await pageCommand('Runtime.evaluate', { expression, returnByValue: true })
    assert.ok(!response.exceptionDetails, expression)
    return response.result.value
  }
  const evidence = process.env.TURNLY_EVIDENCE_DIR
  if (evidence) await mkdir(evidence, { recursive: true })
  for (const width of [360, 768, 1280]) {
    await pageCommand('Emulation.setDeviceMetricsOverride', { width, height: 820, deviceScaleFactor: 1, mobile: width < 500 })
    await pageCommand('Page.navigate', { url: origin + '/' })
    await until(() => evaluate("location.pathname === '/' && document.readyState === 'complete' && !!document.querySelector('#planes') && !!document.documentElement.dataset.productTheme"), 'No cargó la portada con selector de apariencia')
    assert.equal(await evaluate(`document.documentElement.scrollWidth <= ${width}`), true, 'Desborde en portada a ' + width)
    if (width === 1280) {
      await evaluate(`(() => {
        const select = document.querySelector('nav select');
        select.focus();
        if (document.activeElement !== select) throw new Error('Selector sin foco');
        select.value = 'dark';
        select.dispatchEvent(new Event('change', { bubbles: true }));
      })()`)
      await until(() => evaluate("document.documentElement.dataset.productTheme === 'dark'"), 'No se aplicó el tema oscuro')
      const beforeReload = await evaluate('performance.timeOrigin')
      await pageCommand('Page.reload')
      await until(() => evaluate(`performance.timeOrigin !== ${beforeReload} && document.readyState === 'complete' && document.documentElement.dataset.productTheme === 'dark'`), 'No se conservó la preferencia al recargar')
    }
    if (evidence) {
      const { data } = await pageCommand('Page.captureScreenshot', { format: 'png' })
      await writeFile(join(evidence, `turnly-portada-${width}.png`), Buffer.from(data, 'base64'))
    }
    for (const [path, label] of [['/recuperar', 'recovery-email'], ['/recuperar/restablecer', 'new-password']]) {
      await pageCommand('Page.navigate', { url: origin + path })
      const ready = await until(async () => {
        const result = await pageCommand('Runtime.evaluate', {
          expression: `location.pathname === ${JSON.stringify(path)} && document.readyState === 'complete' && !!document.querySelector('label[for="${label}"]')`,
          returnByValue: true,
        })
        return result.result.value
      }, 'Página sin formulario accesible: ' + path)
      assert.equal(ready, true)
      const result = await pageCommand('Runtime.evaluate', {
        expression: `(() => {
          const field = document.getElementById('${label}');
          field.focus();
          return { fits: document.documentElement.scrollWidth <= window.innerWidth, focused: document.activeElement === field, required: field.required }
        })()`,
        returnByValue: true,
      })
      assert.deepEqual(result.result.value, { fits: true, focused: true, required: true })
    }
  }
  console.log('Chromium: portada y formularios sin desborde a 360, 768 y 1280 px. Preferencia oscura persistente.')
} finally {
  if (!exited) {
    processHandle.kill()
    await Promise.race([once(processHandle, 'exit').catch(() => {}), pause(1500)])
  }
  await rm(profile, { recursive: true, force: true })
}
