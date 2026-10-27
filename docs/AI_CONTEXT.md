# Turnly — contexto rápido para agentes de IA

Leer este archivo primero y después solo los documentos necesarios. No inferir que un PR, build o deployment de preview equivale a una corrección en producción.

## Fuente de verdad y ramas

- Repositorio: [Vale-G/turnos-saas](https://github.com/Vale-G/turnos-saas).
- Rama de referencia para cambios: `codex/revisar-informes-de-turnos-cancelados`; base observada en los PR activos: `07bd2ee75b16e91a3d31f63b60cf7d8796d614cf`.
- Último deployment de Vercel marcado como producción observado el 2026-10-27: commit `bc234fb0b8c981935602168ca0b6982d24d0956f`, rama `codex/revisar-informes-de-turnos-cancelados`. Producción y punta de rama no coinciden exactamente.
- PR #10 (borrador): plan de contención P0, rama `codex/auditoria-turnly-2026-10-26`. Solo documentación.
- PR #11 (borrador): CI y documentación, rama `codex/ci-automatico-lint-build`; base `07bd2ee...`. Fix incremental en `20485a0fe924d71a292fcc9d8bf1e0cb160a096f`; último head documental conocido `163e652db789c1865ecefa0f01329ad6a732feaa`.
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
- No hay script `test` ni entorno de Supabase de prueba confirmado. No ejecutar migraciones, cambios de RLS ni pruebas de escritura en la base activa.

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
