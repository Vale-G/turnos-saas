# Issue #12 — seguridad, disponibilidad y reservas concurrentes

Última verificación: 2026-11-05.

## Alcance implementado

- La creación de reservas públicas pasa por rutas de servidor y por la función
  `turnly_create_public_booking`; el navegador ya no inserta turnos directamente.
- La base valida negocio, servicio, profesional, duración, horario, bloqueos,
  antelación y superposición antes de guardar.
- Un bloqueo transaccional por profesional y fecha serializa intentos concurrentes.
- Los enlaces públicos usan un token aleatorio cuyo hash se guarda en la base.
- Las políticas RLS aíslan los datos por negocio y las tablas operativas dejan de
  estar expuestas a `anon`.
- Los webhooks validan firma, consultan el pago real y aplican importe, moneda e
  idempotencia en la base.
- Las credenciales de Mercado Pago se administran sólo desde una ruta autenticada
  y nunca vuelven al navegador.

## Migración

Archivo: `supabase/migrations/20261031015309_booking_security_and_intervals.sql`.

La migración debe aplicarse primero en un proyecto Supabase aislado. No debe
ejecutarse sobre producción hasta completar el QA funcional y aprobarlo
explícitamente. Antes de aplicarla se debe conservar un respaldo y verificar que
el esquema del entorno coincide con `tests/fixtures/schema.sql`.

## Evidencia reproducible local

```bash
npm ci
npm test
npm run typecheck
npm run lint
NEXT_PUBLIC_SUPABASE_URL=https://build.invalid \
NEXT_PUBLIC_SUPABASE_ANON_KEY=build-placeholder \
SUPABASE_SERVICE_ROLE_KEY=build-placeholder \
NEXT_PUBLIC_SITE_URL=http://localhost:3000 \
npm run build
npm audit --omit=dev --audit-level=high
```

Resultado observado: 24 pruebas aprobadas, TypeScript aprobado, ESLint sin errores,
build aprobado y cero vulnerabilidades conocidas en dependencias de producción.

CI remoto verificado:

- Run `42102331893`: todos los jobs aprobados.
- PostgreSQL 17 ejecutó dos conexiones concurrentes y persistió una sola reserva.

El workflow de CI levanta PostgreSQL 17 y además ejecuta:

```bash
bash tests/native-concurrency.sh
```

La prueba abre dos conexiones independientes que intentan reservar el mismo
profesional y horario. Debe persistir exactamente una reserva y rechazarse la otra.

## Supabase QA aislado

- Proyecto: `hwrlimcunbenxsvfbklr` (no producción).
- Migración `booking_security_and_intervals` aplicada el 2026-11-05.
- `tests/supabase-qa-transaction.sql` se ejecutó sin errores y terminó en
  `ROLLBACK`: reserva válida, superposición rechazada, turno adyacente aceptado,
  token opaco, funciones privadas para `anon` y aislamiento RLS por negocio.
- Verificación posterior: cero filas en `public.negocio` y `public.turno`.
- Los avisos del asesor sobre tablas plurales (`negocios`, `turnos`, `perfiles`,
  `lista_negra`) y `public.rls_auto_enable()` pertenecen al esquema preexistente
  del sandbox y no fueron alterados por esta migración.

## Preview E2E verificado

- Deployment: `dpl_47nvUtny3tXwQpBCgXLdqDe3Btew`, commit
  `a4ef608e5357818dc03d2e2c490a08c985cc6178`, estado `READY`.
- La rama `codex/turnly-issue-12` usa URL, clave pública y clave secreta exclusivas
  del Supabase QA. No se usaron variables productivas.
- Lectura de negocio, servicios, profesionales y disponibilidad: HTTP 200.
- Primera reserva: HTTP 201. Segundo intento sobre el mismo horario: HTTP 409.
- Seguimiento con token opaco: HTTP 200 sin exponer email, teléfono ni datos
  internos. Cancelación autenticada por token: HTTP 200.
- La cancelación liberó nuevamente el horario en disponibilidad.
- Número en lista negra: HTTP 403. Configuración de lista negra inválida: HTTP 503
  (fail-closed, no creó una reserva).
- Persistencia comprobada antes del cleanup: estado `cancelado`, duración 60 minutos
  y `hora_fin` 11:00 para una reserva iniciada a las 10:00.
- Cleanup comprobado: cero negocios, turnos, servicios y profesionales ficticios.

## Límites y validación pendiente

- QA independiente reprodujo tres bypasses P1 posteriores al primer E2E: un
  intervalo legado sin snapshot, edición directa de columnas derivadas y
  recálculo de una duración histórica al cambiar estado. La migración incremental
  `20261105211500_booking_interval_hardening.sql` corrige los tres casos y cuenta
  con regresiones locales (27/27). Su aplicación en Supabase QA está pendiente
  porque la confirmación del conector expiró; no se ejecutó parcialmente.
- El flujo externo completo de Mercado Pago necesita credenciales sandbox y un
  webhook accesible; las reglas de importe e idempotencia sí tienen prueba de base.
- El `npm audit` completo informa alertas moderadas únicamente en herramientas de
  desarrollo de ESLint. El árbol usado en producción informa cero vulnerabilidades;
  no se aplicó el downgrade incompatible sugerido por `npm audit fix --force`.
- No se debe promover ningún Preview ni integrar la rama hasta que CI termine en
  verde y QA pruebe el Preview contra la base aislada.

## Variables requeridas para Preview aislado

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_SITE_URL`
- `RESEND_API_KEY` (para validar notificaciones)
- Credenciales sandbox de Mercado Pago (para validar pagos externos)

Los valores de Preview deben pertenecer exclusivamente al proyecto de QA y nunca
copiarse desde producción.
