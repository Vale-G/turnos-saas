# Changelog técnico

## 2026-10-27 — CI independiente y documentación de continuidad

- Rama de trabajo: `codex/ci-automatico-lint-build`.
- PR: [#11 — CI: ejecutar lint y build](https://github.com/Vale-G/turnos-saas/pull/11), borrador, sin fusionar.
- Commit de documentación/CI: `ac581183ede93a229f110fa23e53f2ab67fae63d`.
- Cambios: jobs separados de lint/build; documentación de contexto, arquitectura, seguridad, RLS, pagos, roadmap y changelog.
- Run [40500059792](https://github.com/Vale-G/turnos-saas/actions/runs/40500059792): instalación aprobada en ambos jobs; lint falló con 37 errores y 15 warnings; build falló por variables públicas de Supabase ausentes.
- Corrección en commit `06e751192e6438b7c28ffb884a29fd6129e6173e`: placeholders locales ficticios para el build, sin secretos ni conexión a una base real.
- Run [40500358257](https://github.com/Vale-G/turnos-saas/actions/runs/40500358257): build aprobado; lint falló con 37 errores y 15 warnings.
- Seguimiento: agregar medición de lint sobre el SHA base exacto para demostrar si los errores son deuda previa. Resultado pendiente de CI.
- No se modificaron código de runtime, Supabase, datos, secretos ni producción.
