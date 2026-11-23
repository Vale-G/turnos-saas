// Loopback only. The browser exercises public UI without credentials or external messages.
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { once } from 'node:events'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { setTimeout as pause } from 'node:timers/promises'

const binary = process.env.TURNLY_BROWSER
assert.ok(binary, 'TURNLY_BROWSER must point to a local Chromium-compatible binary')
const profile = await mkdtemp(join(tmpdir(), 'turnly-browser-'))
const processHandle = spawn(binary, [
  '--headless', '--no-sandbox', '--disable-dev-shm-usage', '--disable-background-networking',
  '--no-first-run', '--remote-debugging-port=0', '--user-data-dir=' + profile, 'about:blank',
], { stdio: 'ignore' })
let connection
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
  const port = await until(async () => {
    try { return Number((await readFile(join(profile, 'DevToolsActivePort'), 'utf8')).split('\n')[0]) } catch { return 0 }
  }, 'Chromium never exposed the local debugging socket')
  const pages = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()
  const target = pages.find(page => page.type === 'page')
  assert.ok(target)
  const wsUrl = new URL(target.webSocketDebuggerUrl)
  assert.equal(wsUrl.hostname, '127.0.0.1')
  connection = new WebSocket(wsUrl)
  await once(connection, 'open')
  let sequence = 0
  function command(method, params = {}) {
    const id = ++sequence
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        connection.removeEventListener('message', receive)
        reject(new Error(method + ' timed out'))
      }, 8000)
      function receive(event) {
        const message = JSON.parse(event.data)
        if (message.id !== id) return
        connection.removeEventListener('message', receive)
        clearTimeout(timeout)
        if (message.error) reject(new Error(method + ': ' + message.error.message))
        else resolve(message.result)
      }
      connection.addEventListener('message', receive)
      connection.send(JSON.stringify({ id, method, params }))
    })
  }

  const origin = 'http://127.0.0.1:3100'
  async function evaluate(expression) {
    const response = await command('Runtime.evaluate', { expression, returnByValue: true })
    assert.ok(!response.exceptionDetails, expression)
    return response.result.value
  }
  const evidence = process.env.TURNLY_EVIDENCE_DIR
  if (evidence) await mkdir(evidence, { recursive: true })
  for (const width of [360, 768, 1280]) {
    await command('Emulation.setDeviceMetricsOverride', { width, height: 820, deviceScaleFactor: 1, mobile: width < 500 })
    await command('Page.navigate', { url: origin + '/' })
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
      await command('Page.reload')
      await until(() => evaluate("document.readyState === 'complete' && document.documentElement.dataset.productTheme === 'dark'"), 'No se conservó la preferencia al recargar')
    }
    if (evidence) {
      const { data } = await command('Page.captureScreenshot', { format: 'png' })
      await writeFile(join(evidence, `turnly-portada-${width}.png`), Buffer.from(data, 'base64'))
    }
    for (const [path, label] of [['/recuperar', 'recovery-email'], ['/recuperar/restablecer', 'new-password']]) {
      await command('Page.navigate', { url: origin + path })
      const ready = await until(async () => {
        const result = await command('Runtime.evaluate', {
          expression: `location.pathname === ${JSON.stringify(path)} && document.readyState === 'complete' && !!document.querySelector('label[for="${label}"]')`,
          returnByValue: true,
        })
        return result.result.value
      }, 'Página sin formulario accesible: ' + path)
      assert.equal(ready, true)
      const result = await command('Runtime.evaluate', {
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
  connection?.close()
  if (!exited) {
    processHandle.kill()
    await Promise.race([once(processHandle, 'exit').catch(() => {}), pause(1500)])
  }
  await rm(profile, { recursive: true, force: true })
}
