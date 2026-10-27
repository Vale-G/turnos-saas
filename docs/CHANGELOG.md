# Changelog técnico

## 2026-10-27 — CI independiente y documentación de continuidad

- Rama de trabajo: `codex/ci-automatico-lint-build`.
- PR: [#11 — CI: ejecutar lint y build](https://github.com/Vale-G/turnos-saas/pull/11), borrador, sin fusionar.
- Commit base revisado antes de estos cambios: `f871b0553352dbc0fee8cb2733964d8f0c2b86e8`.
- Cambios preparados en esta jornada: separar lint y build en jobs independientes y agregar documentación concisa de contexto, arquitectura, seguridad, RLS, pagos y roadmap.
- Validación previa disponible: run [40411983369](https://github.com/Vale-G/turnos-saas/actions/runs/40411983369): instalación aprobada; lint falló con 37 errores y 15 warnings; build omitido.
- Validación de esta revisión: pendiente de la nueva ejecución de GitHub Actions; actualizar este registro con su enlace y resultado cuando termine.
- No se modificaron código de runtime, Supabase, datos, secretos ni producción.
