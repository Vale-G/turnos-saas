# Changelog técnico

## 2026-10-27 — CI independiente y documentación de continuidad

- Rama de trabajo: `codex/ci-automatico-lint-build`.
- PR: [#11 — CI: ejecutar lint y build](https://github.com/Vale-G/turnos-saas/pull/11), borrador, sin fusionar.
- Commit inicial de la iteración: `ac581183ede93a229f110fa23e53f2ab67fae63d`.
- Cambios: jobs separados de lint/build; documentos de contexto, arquitectura, seguridad, RLS, pagos, roadmap y changelog; actualización de `docs/TESTING.md`.
- Run [40500059792](https://github.com/Vale-G/turnos-saas/actions/runs/40500059792): instalación aprobada en ambos jobs; lint falló con 37 errores y 15 warnings; build falló al prerenderizar `/clientes` y `/registro-negocio` por variables públicas de Supabase ausentes.
- Seguimiento: se agregan placeholders ficticios y locales solo al entorno del job de build; no se usan credenciales reales. El resultado del nuevo run queda pendiente.
- No se modificaron código de runtime, Supabase, datos, secretos ni producción.
