# Turnly — contexto rápido para agentes de IA

Leer este archivo primero y después solo los documentos necesarios. No inferir que un PR, build o deployment de preview equivale a una corrección en producción.

## Fuente de verdad y ramas

- Repositorio: [Vale-G/turnos-saas](https://github.com/Vale-G/turnos-saas).
- Rama de referencia para cambios: `codex/revisar-informes-de-turnos-cancelados`; base observada en los PR activos: `07bd2ee75b16e91a3d31f63b60cf7d8796d614cf`.
- Verificación Vercel del 2026-10-29: el deployment listado como producción más reciente en la rama estable está `READY` en commit `bc234fb0b8c981935602168ca0b6982d24d0956f`; la punta de la rama estable es `07bd2ee75b16e91a3d31f63b60cf7d8796d614cf`. No coinciden; no asumir que los tres commits posteriores estén desplegados.
- PR #10 (borrador): plan de contención P0, rama `codex/auditoria-turnly-2026-10-26`. Solo documentación.
- PR #11 (borrador, abierto y sin merge): rama `codex/ci-automatico-lint-build`, base `07bd2ee75b16e91a3d31f63b60cf7d8796d614cf`, head verificado `88d146a80c7bcef89632bae2e00539ddea458a3b`.
- No fusionar, desplegar a producción ni modificar la rama estable sin aprobación explícita. Los deployments de preview no prueban flujos funcionales.

## Qué es el proyecto

Aplicación web Next.js con App Router, React, Supabase y rutas de API para reservas, checkout, señas, suscripciones y notificaciones. Confirmar el comportamiento en código antes de cambiarlo; el README todavía es la plantilla de Next.js.

## Lectura recomendada

1. [Resumen del producto](PROJECT_OVERVIEW.md)
2. [Arquitectura](ARCHITECTURE.md)
3. [Seguridad](SECURITY.md)
4. [Base de datos y RLS](DATABASE_AND_RLS.md)
5. [Pagos](PAYMENTS.md)
6. [Pruebas y CI](TESTING.md)
7. [Roadmap y bloqueos](ROADMAP.md)
8. [Changelog técnico](CHANGELOG.md)
9. [Plan P0 detallado en PR #10](https://github.com/Vale-G/turnos-saas/pull/10)

## Estado crítico verificado

- P0: políticas públicas demasiado amplias en `turno` y `negocio`; la página de reserva consulta `negocio.select('*')` y lee turnos desde el navegador.
- P1: la política de gestión de `bloqueo` no verifica propiedad del negocio.
- Pagos: el webhook genérico de Mercado Pago no valida firma; faltan verificaciones estrictas de importe, moneda, referencia e idempotencia. El endpoint de señas apunta a `/api/webhooks/sena`, ruta que no se encontró en la rama auditada.
- Run [40501240344](https://github.com/Vale-G/turnos-saas/actions/runs/40501240344): build aprobado; lint bajó de 37 a 35 errores y mantuvo 15 warnings; baseline de la base continúa en 37 errores y 15 warnings. La corrección incremental quitó dos errores JSX.
- `npm test` existe y cubre cinco casos unitarios de helpers puros; no hay integración/E2E. `Tunero 2` está activo pero su esquema no es compatible con Turnly y tiene permisos que requieren revisión; no usarlo aún para validar RLS. No ejecutar migraciones, cambios de RLS ni escrituras en la base activa.

## Reglas de evidencia

Etiquetar cada afirmación como **confirmada**, **inferida** o **pendiente de verificar** cuando corresponda. Nunca guardar secretos, tokens, variables de entorno ni datos personales reales. No afirmar que una prueba pasó sin leer su resultado real. Si el bloqueo es de entorno, continuar solo con trabajo estático/documental seguro.


## Seguimiento más reciente — 2026-10-27

- PR #11 sigue abierto en borrador. El último run observado antes del fix incremental es [40502014733](https://github.com/Vale-G/turnos-saas/actions/runs/40502014733): build aprobado, lint fallido (35 errores, 15 warnings), baseline de lint fallido y auditoría de dependencias informativa.
- La auditoría reportó 20 vulnerabilidades (1 baja, 6 moderadas, 12 altas, 1 crítica) y avisos de Next.js. No se actualizaron dependencias sin regenerar `package-lock.json` y probar compatibilidad.
- Fix de lint en curso en `app/servicios/page.tsx`: tipos explícitos para servicio/negocio y guard previo al guardado. Revisar el siguiente run de CI antes de afirmar el resultado.
- No hay suite de tests ni entorno aislado Supabase. Los riesgos P0 de acceso público a turnos/campos privados y P1 de pagos/RLS continúan sin mitigación.


QA independiente: se solicitó una ejecución inmediata después del cambio; el informe de esa ejecución es asíncrono y todavía no se debe tratar como aprobado.


- Fix incremental nuevo en `app/informes/page.tsx` (commit `d8b9a3f208276c1f7a2e5b8bd38e3629d9ee784e`): tipado de negocio/filas de informes y captura de ID local para consultas; validación de CI pendiente. Mantener el estado global como no aprobado hasta leer el run.


- En `app/informes/page.tsx`, el run 40504213203 detectó una regresión de build: las relaciones Supabase `servicio`/`staff` llegan como arrays. Corregido en commit `d06bfd54987f2d5a4b05606a529d04fc9b38c26f` para admitir objeto o array y usar el primer registro. El siguiente run debe confirmar que build vuelve a pasar.


- Run [40504440927](https://github.com/Vale-G/turnos-saas/actions/runs/40504440927) confirmó build aprobado tras el fix `d06bfd54987f2d5a4b05606a529d04fc9b38c26f`; lint sigue fallando con 30 errores/15 warnings; baseline 37 errores/15 warnings. No marcar CI global como aprobada.


## Seguimiento — 2026-10-28

- Fix incremental en `app/bloqueos/page.tsx`, commit `aaaf6e9be257ff546c10be42f8bd0804cf9f8bf6`: tipos explícitos para negocio/staff/bloqueos, relación staff objeto/array y guard de negocio antes de insertar. CI posterior pendiente de comprobación.
- PR #11 sigue draft y sin merge. Rama base `codex/revisar-informes-de-turnos-cancelados` (SHA `07bd2ee75b16e91a3d31f63b60cf7d8796d614cf`); producción verificada previamente en `bc234fb0b8c981935602168ca0b6982d24d0956f`.
- El Día 3 de contención de lectura pública sigue bloqueado: no existe instancia Supabase de prueba confirmada. No tocar RLS ni producción. El P0 continúa abierto.


### Estado confirmado — 2026-10-28

- Run [40683854423](https://github.com/Vale-G/turnos-saas/actions/runs/40683854423): instalación aprobada, build aprobado, lint fallido con 27 errores/15 warnings; baseline exacto 37 errores/15 warnings. Fix de `app/bloqueos/page.tsx` redujo tres errores.
- Auditoría de dependencias: 20 vulnerabilidades (1 baja, 6 moderadas, 12 altas, 1 crítica); actualización pendiente, sin cambios de lockfile.
- QA independiente invocado; la última consulta seguía `in_progress`, sin resultado final todavía.
- P0 de lectura pública/RLS continúa abierto por falta de instancia Supabase aislada. No modificar producción ni la base activa.


### QA y corrección posterior — 2026-10-28

- QA del commit `aaaf6e9be257ff546c10be42f8bd0804cf9f8bf6` concluyó **NO APROBADO**; reportó build aprobado, lint 27 errores/15 warnings y ausencia de pruebas funcionales. Además identificó que no se validaba fin > inicio y que el borrado no comprobaba errores.
- Se corrigió `app/bloqueos/page.tsx` para validar el rango y comprobar el resultado de eliminación. Se extrajeron helpers puros a `lib/bloqueos-helpers.mjs` con declaraciones TS y se agregaron pruebas Node nativas en `tests/bloqueos-helpers.test.mjs`.
- `package.json` ahora define `npm test`; `.github/workflows/ci.yml` incorpora un job unitario separado. El resultado de CI y el re-QA de esta corrección aún deben comprobarse.
- Los riesgos P0 de RLS/lectura pública y las 20 vulnerabilidades de dependencias siguen abiertos; no tocar producción ni la base activa.


### Resultado final de CI conocido — 2026-10-28

- Run [40684537949](https://github.com/Vale-G/turnos-saas/actions/runs/40684537949), head `2e10b20ab6efe8173d70a517fd9e7e08ba97793a`: build aprobado, 5/5 tests unitarios aprobados, lint fallido con 27 errores/15 warnings; baseline 37 errores/15 warnings; 20 vulnerabilidades (1 crítica).
- La suite Node nativa cubre helpers de rango horario y forma de relación staff; no cubre integración con Supabase ni aislamiento RLS.
- La segunda ejecución de QA fue solicitada; resultado final pendiente. P0 de lectura pública continúa abierto por falta de entorno aislado.


## Seguimiento — 2026-10-29 — Día 4, puerta P0 todavía bloqueada

- Rama estable GitHub: `codex/revisar-informes-de-turnos-cancelados` @ `07bd2ee75b16e91a3d31f63b60cf7d8796d614cf`. Producción Vercel observada: deployment `READY` en `bc234fb0b8c981935602168ca0b6982d24d0956f`; no hacer merge/deploy ni alterar la rama estable.
- PR #11 sigue en borrador. Head `88d146a80c7bcef89632bae2e00539ddea458a3b`; CI run [40779968499](https://github.com/Vale-G/turnos-saas/actions/runs/40779968499): `npm ci` aprobado, `npm test` 5/5 aprobado, `npm run build` aprobado, lint fallido con 27 errores/15 warnings frente a baseline de 37/15; auditoría informativa reporta 20 vulnerabilidades (1 crítica). CI global no aprobada.
- Revisión estática de `app/reservar/[slug]/page.tsx` en la rama estable confirma que el navegador usa `negocio.select('*')`, consulta `turno.select('hora')` para disponibilidad e inserta directamente en `turno`. El riesgo P0 no está contenido.
- `Tunero 2` está `ACTIVE_HEALTHY`, pero sus tablas (`negocios`, `perfiles`, `turnos`, `lista_negra`) no corresponden al esquema que usa Turnly (`negocio`, `turno`, `servicio`, `staff`, `bloqueo`, `bloquehorario`). La herramienta no devolvió migraciones registradas. Además, `public.rls_auto_enable()` es `SECURITY DEFINER` y puede ejecutarse por `anon` y `authenticated`; no se ejecutó ni se modificó.
- Decisión técnica: no implementar una migración o cambio RLS hasta localizar una fuente de verdad verificable del esquema y preparar una estrategia de pruebas aislada. No hay código de runtime modificado en esta jornada.
- Próximo paso: obtener/confirmar esquema SQL versionado compatible; diseñar el endpoint de perfil público con allowlist y la creación de reserva server-side; después preparar migración revisable, pruebas anon/propietario A/propietario B y concurrencia. QA de la documentación de hoy se solicita al equipo independiente.


### Resultado final del run documental 40862792874

- Build: aprobado.
- Pruebas unitarias: 5/5 aprobadas.
- ESLint: fallido, 27 errores y 15 warnings.
- Baseline 37 errores/15 warnings y auditoría de 20 vulnerabilidades proceden del run PR [40779968499](https://github.com/Vale-G/turnos-saas/actions/runs/40779968499); en el run de push los jobs informativos se omitieron.
- No hay cambios de runtime ni pruebas funcionales nuevas. El P0 permanece abierto.


## Seguimiento — 2026-10-29 — trabajo técnico en reservas

- La rama estable sigue en `07bd2ee75b16e91a3d31f63b60cf7d8796d614cf`; producción Vercel permanece en `bc234fb0b8c981935602168ca0b6982d24d0956f`. PR #11 continúa como borrador.
- Se implementó en rama de trabajo el helper `lib/reserva-disponibilidad.mjs` y su declaración `.d.mts`, ocho tests en `tests/reserva-disponibilidad.test.mjs` y la integración en `app/reservar/[slug]/page.tsx`. Commit de integración `a1d4a70b8f3e42074d3e001e6b6bda8137d82cae`.
- Evita mostrar intervalos incompletos, solapamientos con bloqueos parciales y bucles con duración no positiva. No es protección server-side: la app sigue consultando turnos y creando reservas desde el navegador, y no conoce la duración de turnos existentes.
- Consultar `docs/TESTING.md` para pruebas y evidencia de CI; `docs/CHANGELOG.md` para cambios. No fusionar ni desplegar hasta revisión y aprobación. P0 de lectura pública/RLS sigue abierto.
