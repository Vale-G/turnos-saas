# Arquitectura actual

## Capas observadas

- **Interfaz:** páginas Next.js en `app/`; la página pública de reserva está en `app/reservar/[slug]/page.tsx`.
- **API:** Route Handlers bajo `app/api/`, incluidos checkout, señas, notificaciones y webhooks.
- **Datos y autenticación:** Supabase; el código usa tanto cliente de navegador como cliente server-side con cookies. Algunas rutas usan un cliente administrativo con service-role, que debe permanecer exclusivamente en servidor.
- **Pagos:** `lib/mercadopago.ts` crea preferencias; `lib/webhooks/mercadopago-handler.ts` consulta pagos y procesa estados.
- **Correo:** `app/api/notificar/route.ts` usa Resend.

## Flujos de alto nivel

1. El navegador carga el perfil público y consulta disponibilidad.
2. El navegador crea la reserva mediante Supabase.
3. Checkout o señas crean una preferencia de Mercado Pago.
4. Webhooks consultan el pago al proveedor y actualizan datos en Supabase.

Los pasos anteriores describen el código observado, no una arquitectura recomendada. En particular, los pasos públicos 1–2 dependen de policies RLS que actualmente presentan riesgos.

## Diseño objetivo (pendiente de implementar)

- API/RPC pública que devuelva solo campos permitidos del negocio.
- Disponibilidad sin exponer filas privadas de reservas.
- Creación de reservas validada en servidor/base de datos y resistente a concurrencia.
- Validación de firma, importe, moneda, referencia y estado antes de actualizar por webhook.
- Pruebas aisladas para permisos, reservas y pagos.

No se confirmó una cola de trabajos, suite de tests ni entorno de staging dedicado.
