# Seguridad — estado y prioridades

## Riesgos confirmados por revisión estática/metadatos (2026-10-26)

- **P0 — datos de reservas:** `public.turno` tiene política SELECT pública con `true` y política INSERT pública con `WITH CHECK (true)`; el rol `anon` tiene SELECT/INSERT.
- **P0 — campos privados de negocio:** `public.negocio` permite SELECT público con `true`; la página pública usa `select('*')` y la tabla contiene `mp_access_token`. El valor del token no se leyó; tratarlo como potencialmente expuesto.
- **P1 — propiedad:** política ALL de `bloqueo` exige autenticación, pero no verifica que el registro pertenezca al negocio del usuario.
- **P1 — pagos:** webhook genérico sin verificación de firma; validaciones de importe, moneda, referencia e idempotencia incompletas.
- **P1 — correo:** `/api/notificar` recibe destinatarios y contenido del cliente e interpola texto en HTML sin escape contextual suficiente.

## Estado de mitigación

Los hallazgos están documentados, no corregidos. El [PR #10](https://github.com/Vale-G/turnos-saas/pull/10) contiene un plan de contención P0 y sigue en borrador. No se modificó producción ni Supabase.

## Reglas

- Nunca exponer service-role keys, tokens de proveedor o columnas administrativas al navegador.
- No cambiar policies/migraciones sobre la base activa desde una rama de trabajo.
- Probar anon, propietario, otro negocio y administrador con datos ficticios en un entorno aislado.
- Considerar potencialmente expuesto el token de Mercado Pago hasta contener y verificar el acceso; coordinar rotación segura sin registrar su valor.


## Riesgo de dependencias — verificado el 2026-10-27

- `package.json` fija `next` en 16.1.6 y `eslint-config-next` en 16.1.6.
- El job `npm audit --json` del [run 40503354300](https://github.com/Vale-G/turnos-saas/actions/runs/40503354300) reportó 20 vulnerabilidades (1 baja, 6 moderadas, 12 altas, 1 crítica), con advisories críticas de Next.js.
- La advisory oficial [GHSA-2464-fhr4-w9xw](https://github.com/vercel/next.js/security/advisories/GHSA-2464-fhr4-w9xw) marca afectadas las versiones 16.0.0–16.4.0 y parche desde 16.4.1. El release estable oficial observado es [16.4.3](https://github.com/vercel/next.js/releases).
- Acción pendiente: actualizar `next` y `eslint-config-next` de forma coordinada, regenerar `package-lock.json` con npm, revisar los demás paquetes afectados y ejecutar `npm ci`, lint, build y regresión. No usar `npm audit fix --force`. Ninguna dependencia fue actualizada en esta jornada.


## Verificación adicional — 2026-10-29

- Revisión estática de `app/reservar/[slug]/page.tsx` en `codex/revisar-informes-de-turnos-cancelados` confirma que el navegador hace `negocio.select('*')`, lee horas de `turno` para disponibilidad e inserta directamente una reserva en `turno`. Es un riesgo de diseño/permiso, no una prueba nueva de acceso efectivo a datos.
- El P0 sigue sin mitigación. No se aplicó ninguna policy ni migración porque `Tunero 2` no tiene el esquema compatible y la fuente SQL de las policies actuales sigue sin localizarse.
- CI del PR #11, run [40779968499](https://github.com/Vale-G/turnos-saas/actions/runs/40779968499): build aprobado y tests 5/5 aprobados; lint fallido con 27 errores/15 warnings; baseline 37/15. No declarar seguridad ni QA funcional aprobados.
