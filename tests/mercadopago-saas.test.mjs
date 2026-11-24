import test from 'node:test'
import assert from 'node:assert/strict'
import { createHmac } from 'node:crypto'
import { signedDelivery } from '../lib/server/mercadopago-saas.ts'

test('notificaciones SaaS requieren id firmado en la URL, firma válida y timestamp vigente', () => {
  const ts = '1800000000'
  const now = Number(ts)*1000
  const hmac = createHmac('sha256','fixture').update('id:abc;request-id:sample;ts:'+ts+';').digest('hex')
  const url = new URL('https://sandbox.example.test/webhook?type=subscription_preapproval&data.id=ABC')
  const headers = new Headers({ 'x-request-id':'sample','x-signature':'ts='+ts+',v1='+hmac })
  assert.deepEqual(signedDelivery(url,headers,'fixture',now),{topic:'subscription_preapproval',resource:'ABC'})
  assert.equal(signedDelivery(url,headers,'other',now),null)
  assert.equal(signedDelivery(url,headers,'fixture',now+601_000),null)
  url.searchParams.append('data.id','ABC')
  assert.equal(signedDelivery(url,headers,'fixture',now),null)
  url.searchParams.delete('data.id')
  assert.equal(signedDelivery(url,headers,'fixture',now),null)
})
