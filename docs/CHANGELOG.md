# Changelog técnico

## 2026-10-27 — CI independiente, baseline y documentación de continuidad

- Rama de trabajo: `codex/ci-automatico-lint-build`.
- PR: [#11 — CI: ejecutar lint y build](https://github.com/Vale-G/turnos-saas/pull/11), borrador, sin fusionar.
- Commit de baseline: `2f3044ac1bce998d90c0015e6b33e5a15f9b9580`.
- Cambios: jobs separados de lint/build; baseline informativo sobre el SHA base exacto; documentación de contexto, arquitectura, seguridad, RLS, pagos, roadmap y pruebas.
- Run [40500059792](https://github.com/Vale-G/turnos-saas/actions/runs/40500059792): lint falló con 37 errores y 15 warnings; build falló por variables públicas de Supabase ausentes.
- Run [40500358257](https://github.com/Vale-G/turnos-saas/actions/runs/40500358257): build aprobado con placeholders locales ficticios; lint falló con 37 errores y 15 warnings.
- Run [40500691882](https://github.com/Vale-G/turnos-saas/actions/runs/40500691882): build aprobado; lint del PR falló con 37 errores y 15 warnings; baseline exacto de la base reportó los mismos 37 errores y 15 warnings.
- Conclusión: deuda de lint preexistente confirmada. No se desactivaron reglas ni se modificó código de aplicación para obtener un check verde.
- No se modificaron Supabase, datos, secretos ni producción.
