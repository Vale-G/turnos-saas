# Issue #12 — seguridad, disponibilidad y reservas concurrentes

Última verificación: 2026-11-10.

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
- Migración incremental `booking_interval_hardening` aplicada el 2026-11-05
  mediante el editor SQL del proyecto QA, después de que el conector agotara su
  ventana de confirmación. El editor devolvió `Success. No rows returned`.
- `tests/supabase-qa-transaction.sql` se ejecutó sin errores y terminó en
  `ROLLBACK`: reserva válida, superposición rechazada, turno adyacente aceptado,
  token opaco, funciones privadas para `anon` y aislamiento RLS por negocio.
- Verificación posterior: cero filas en `public.negocio` y `public.turno`.
- La validación transaccional posterior reprodujo los tres bypasses P1: rechazó
  el solapamiento contra una fila legada sin snapshot, denegó a `authenticated`
  la edición de `duracion_minutos`/`hora_fin` y conservó 60 minutos/16:00 al
  cambiar sólo el estado después de modificar el servicio a 30 minutos.
- La consulta de evidencia devolvió `true` para los tres casos y terminó en
  `ROLLBACK`. El control posterior confirmó cero turnos, negocios y usuarios QA.
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

- El hallazgo de QA sobre la limpieza de credenciales heredadas de Mercado Pago
  quedó corregido: una conexión OAuth ya no informa éxito si falla el borrado de
  `negocio.mp_access_token`. La regresión cubre éxito, fallo del guardado cifrado
  y fallo de limpieza. Validación local: 48/48 pruebas, TypeScript, ESLint, build
  y auditoría de dependencias de producción aprobados.

- Revalidación del 2026-11-08: la definición activa de
  `turnly_private.enforce_turno_interval()` en el Supabase QA coincide con la
  revisión endurecida y la prueba transaccional real aprobó reserva válida,
  rechazo de superposición, intervalo adyacente, aislamiento RLS, columnas
  derivadas no editables e intento de inyectar/reactivar un turno cancelado.
  Todo terminó en `ROLLBACK`; el control posterior devolvió cero turnos.
- El 2026-11-09 se registró `booking_interval_hardening` mediante el conector,
  con autorización explícita y exclusivamente en el Supabase QA. El historial
  remoto lista ambas migraciones. La prueba transaccional completa se repitió
  después de aplicarla y el control posterior confirmó cero turnos residuales.
- También se aplicó `legacy_sandbox_surface_lockdown`: `anon` y
  `authenticated` ya no pueden ejecutar la función heredada
  `public.rls_auto_enable()`, y `anon` perdió lectura sobre las cuatro tablas
  plurales antiguas. El asesor dejó de informar ambas exposiciones públicas; no
  se eliminaron tablas, funciones ni datos.
- QA independiente reprodujo tres bypasses P1 posteriores al primer E2E: un
  intervalo legado sin snapshot, edición directa de columnas derivadas y
  recálculo de una duración histórica al cambiar estado. La migración incremental
  `20261105211500_booking_interval_hardening.sql` corrige los tres casos y fue
  validada sobre PostgreSQL QA real. La re-QA encontró además que un usuario
  autenticado podía insertar un turno ya cancelado con campos derivados falsos
  y reactivarlo. La misma migración ahora restringe también `INSERT`, deriva el
  intervalo de altas canceladas y lo recalcula al reactivar. Las regresiones
  locales pasan (29/29) y la revisión activa pasó en PostgreSQL QA real; falta
  registrar la migración y solicitar una nueva revisión independiente.
- El flujo externo completo de Mercado Pago necesita credenciales sandbox y un
  webhook accesible; las reglas de importe e idempotencia sí tienen prueba de base.
- El `npm audit` completo informa alertas moderadas únicamente en herramientas de
  desarrollo de ESLint. El árbol usado en producción informa cero vulnerabilidades;
  no se aplicó el downgrade incompatible sugerido por `npm audit fix --force`.
- No se debe promover ningún Preview ni integrar la rama hasta que CI termine en
  verde y QA pruebe el Preview contra la base aislada.

## Adaptación por rubro

- La portada, precios, alta de negocio, staff y búsqueda de turnos ya no presentan
  Turnly como un producto exclusivo para barberías.
- El lenguaje visible usa “profesionales”, “equipo” y “atender”, e incluye
  consultorios, estética, peluquerías y servicios profesionales.
- Revalidación local posterior: 29/29 pruebas, TypeScript, ESLint y build
  aprobados; dependencias de producción con cero vulnerabilidades conocidas.

## Variables requeridas para Preview aislado

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_SITE_URL`
- `RESEND_API_KEY` (para validar notificaciones)
- Credenciales sandbox de Mercado Pago (para validar pagos externos)

### OAuth de Mercado Pago por negocio

Implementado en la rama `codex/turnly-issue-12`:

- conexión y desconexión desde Ajustes, sin pegar Access Tokens;
- Authorization Code con `state` firmado y PKCE S256;
- access/refresh tokens cifrados con AES-256-GCM antes de persistir;
- tabla `mercadopago_connection` sin permisos para `anon` ni `authenticated`;
- renovación automática antes del vencimiento;
- señas, cobros locales y consulta de webhooks con la cuenta del negocio;
- compatibilidad temporal de lectura con el antiguo `mp_access_token`.

Migración QA aplicada: `20261109004201_mercado_pago_oauth_credentials.sql`.
Verificación posterior: RLS activo, `anon_select=false`,
`authenticated_select=false`, `service_select=true` y cero credenciales guardadas.

Pruebas locales posteriores: 38/38, TypeScript, ESLint y build aprobados.
Las pruebas incluyen cifrado/descifrado, manipulación de ciphertext, vencimiento,
firma de `state` y asociación de cada autorización al usuario y negocio correctos.

Variables servidor necesarias:

- `MP_CLIENT_ID`
- `MP_CLIENT_SECRET`
- `MP_OAUTH_REDIRECT_URI` (debe coincidir exactamente con la URL registrada)
- `MP_OAUTH_STATE_SECRET` (mínimo 32 caracteres)
- `MP_CREDENTIALS_ENCRYPTION_KEY` (32 bytes codificados en base64)

Los dos secretos internos ya están creados sólo para el Preview de esta rama. La
validación externa queda bloqueada hasta crear/configurar la aplicación OAuth de
Mercado Pago y registrar el redirect URI; no se copiaron credenciales productivas.

Los valores de Preview deben pertenecer exclusivamente al proyecto de QA y nunca
copiarse desde producción.

- Configuración Preview OAuth completada el 2026-11-08: Client ID y Client Secret cargados como variables sensibles restringidas a `codex/turnly-issue-12`; callback corto `https://turnly-qa-oauth.vercel.app/api/ajustes/mercadopago/callback`. El secreto debe rotarse antes de producción porque fue compartido en una captura durante la configuración.
