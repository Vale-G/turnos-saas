# Turnly — contexto rápido para agentes de IA

Leer este archivo primero y después solo los documentos necesarios. No inferir que un PR, build o deployment de preview equivale a una corrección en producción.

## Fuente de verdad y ramas

- Repositorio: [Vale-G/turnos-saas](https://github.com/Vale-G/turnos-saas).
- Rama de referencia para cambios: `codex/revisar-informes-de-turnos-cancelados`; base observada en los PR activos: `07bd2ee75b16e91a3d31f63b60cf7d8796d614cf`.
- Último deployment de Vercel marcado como producción observado el 2026-10-27: commit `bc234fb0b8c981935602168ca0b6982d24d0956f`, rama `codex/revisar-informes-de-turnos-cancelados`. Producción y punta de rama no coinciden exactamente.
- PR #10 (borrador): plan de contención P0, rama `codex/auditoria-turnly-2026-10-26`. Solo documentación.
- PR #11 (borrador): CI y documentación, rama `codex/ci-automatico-lint-build`; base `07bd2ee...`. Commit de baseline `2f3044ac1bce998d90c0015e6b33e5a15f9b9580`.
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
- Run [40500691882](https://github.com/Vale-G/turnos-saas/actions/runs/40500691882): build aprobado; lint del PR falló con 37 errores y 15 warnings. El baseline ejecutado sobre la base exacta dio los mismos 37 errores y 15 warnings, confirmando deuda preexistente.
- No hay script `test` ni entorno de Supabase de prueba confirmado. No ejecutar migraciones, cambios de RLS ni pruebas de escritura en la base activa.

## Reglas de evidencia

Etiquetar cada afirmación como **confirmada**, **inferida** o **pendiente de verificar** cuando corresponda. Nunca guardar secretos, tokens, variables de entorno ni datos personales reales. No afirmar que una prueba pasó sin leer su resultado real. Si el bloqueo es de entorno, continuar solo con trabajo estático/documental seguro.
