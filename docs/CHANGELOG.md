# Changelog técnico

## 2026-10-27 — CI independiente, baseline, lint incremental y auditoría de dependencias

- Rama de trabajo: `codex/ci-automatico-lint-build`.
- PR: [#11 — CI: ejecutar lint y build](https://github.com/Vale-G/turnos-saas/pull/11), borrador, sin fusionar.
- Commit de baseline: `2f3044ac1bce998d90c0015e6b33e5a15f9b9580`.
- Cambios: jobs separados de lint/build; baseline informativo sobre el SHA base exacto; job informativo de `npm audit --json`; documentación de contexto, arquitectura, seguridad, RLS, pagos, roadmap y pruebas.
- Run [40500691882](https://github.com/Vale-G/turnos-saas/actions/runs/40500691882): build aprobado; lint del PR y baseline exacto reportaron los mismos 37 errores y 15 warnings.
- Fix incremental en commit `20485a0fe924d71a292fcc9d8bf1e0cb160a096f`: se escaparon dos comillas en `app/terminos/page.tsx`.
- Run [40501240344](https://github.com/Vale-G/turnos-saas/actions/runs/40501240344): build aprobado; lint del PR bajó a 35 errores y 15 warnings; baseline mantuvo 37 errores y 15 warnings.
- Run [40501476049](https://github.com/Vale-G/turnos-saas/actions/runs/40501476049): mismo resultado en el head documental posterior.
- Nueva tarea: ejecutar `npm audit --json` sin cambios automáticos para identificar paquetes y avisos. Resultado pendiente.
- No se desactivaron reglas. No se modificaron Supabase, datos, secretos ni producción.


## 2026-10-27 — tipado incremental en servicios y seguimiento de dependencias

- Rama: `codex/ci-automatico-lint-build`; PR #11, borrador y sin fusionar.
- Código: `app/servicios/page.tsx` ahora usa tipos locales explícitos para negocio y servicios en lugar de tres usos de `any`; convierte valores numéricos a texto para los inputs y evita iniciar guardado cuando no hay negocio cargado.
- Evidencia previa al fix: [run 40502014733](https://github.com/Vale-G/turnos-saas/actions/runs/40502014733), build aprobado, lint fallido con 35 errores/15 warnings, baseline fallido y auditoría informativa con 20 vulnerabilidades (incluida una crítica). El fix aún debe ser validado por una nueva ejecución.
- No se modificaron dependencias/lockfile, Supabase, RLS, datos, secretos ni producción. No se declara QA aprobado.
