# Changelog técnico

## 2026-10-27 — CI independiente, baseline y documentación de continuidad

- Rama de trabajo: `codex/ci-automatico-lint-build`.
- PR: [#11 — CI: ejecutar lint y build](https://github.com/Vale-G/turnos-saas/pull/11), borrador, sin fusionar.
- Commit de baseline: `2f3044ac1bce998d90c0015e6b33e5a15f9b9580`.
- Cambios: jobs separados de lint/build; baseline informativo sobre el SHA base exacto; documentación de contexto, arquitectura, seguridad, RLS, pagos, roadmap y pruebas.
- Run [40500059792](https://github.com/Vale-G/turnos-saas/actions/runs/40500059792): lint falló con 37 errores y 15 warnings; build falló por variables públicas de Supabase ausentes.
- Run [40500358257](https://github.com/Vale-G/turnos-saas/actions/runs/40500358257): build aprobado con placeholders locales ficticios; lint falló con 37 errores y 15 warnings.
- Run [40500691882](https://github.com/Vale-G/turnos-saas/actions/runs/40500691882): build aprobado; lint del PR y baseline exacto reportaron los mismos 37 errores y 15 warnings.
- Run [40500899105](https://github.com/Vale-G/turnos-saas/actions/runs/40500899105): build aprobado; lint del PR falló con 37 errores y 15 warnings; baseline idéntico.
- Fix incremental en commit `20485a0fe924d71a292fcc9d8bf1e0cb160a096f`: se escaparon dos comillas en `app/terminos/page.tsx`.
- Run [40501240344](https://github.com/Vale-G/turnos-saas/actions/runs/40501240344): build aprobado; lint del PR bajó a 35 errores y 15 warnings; baseline mantuvo 37 errores y 15 warnings. Dos errores menos, sin desactivar reglas.
- No se modificaron Supabase, datos, secretos ni producción.
