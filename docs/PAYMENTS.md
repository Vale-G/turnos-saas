# Pagos, señas y suscripciones

## Rutas y módulos observados

- `app/api/checkout/route.ts`: crea checkout de un turno usando precio del servicio y usuario autenticado.
- `app/api/sena/route.ts`: crea preferencia de seña con `monto_sena` recibido del cliente y token `mp_access_token` del negocio.
- `app/api/webhooks/mercadopago/route.ts`: consulta el pago a Mercado Pago y procesa el turno; la ruta no llama a `verificarFirmaMercadoPago`.
- `app/api/webhooks/suscripcion/route.ts`: llama a `verificarFirmaMercadoPago` antes de consultar y procesar el pago.
- `lib/mercadopago.ts` y `lib/webhooks/mercadopago-handler.ts`: creación de preferencia, consulta de pago y actualización de estados.

## Riesgos confirmados

- El checkout valida algunas relaciones, pero falta validar de forma completa propiedad/estado cobrable del turno.
- La seña acepta el importe del cuerpo, actualiza el turno sin comprobar suficientemente errores y construye `external_reference` con sufijo `|sena`.
- `/api/sena` configura `notification_url` a `/api/webhooks/sena`; esa ruta no se encontró en la rama revisada.
- El webhook genérico no valida firma en su Route Handler y el procesamiento no valida estrictamente importe, moneda, referencia esperada e idempotencia.
- La construcción del manifiesto de firma de Mercado Pago necesita contrastarse con documentación oficial y pruebas válidas/inválidas antes de depender de ella.
- El flujo de señas debe separarse del flujo de suscripción de Turnly.

## Criterios antes de habilitar cambios

- Verificar firma según documentación vigente.
- Consultar el pago con credencial privada de servidor.
- Comparar referencia, turno/negocio, importe, moneda y estado esperado.
- Hacer el procesamiento idempotente y no permitir regresiones de estado.
- Probar con sandbox/mocks: aprobado, rechazado, importe incorrecto, moneda incorrecta, referencia inválida, firma incorrecta y duplicados.

No se enviaron pagos reales ni se modificaron credenciales.
