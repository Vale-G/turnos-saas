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
- Evidencia previa al fix: [run 40502014733](https://github.com/Vale-G/turnos-saas/actions/runs/40502014733), build aprobado, lint fallido con 35 errores/15 warnings, baseline fallido y auditoría informativa con 20 vulnerabilidades (incluida una crítica).
- Validación posterior: [run 40503354300](https://github.com/Vale-G/turnos-saas/actions/runs/40503354300), build aprobado, lint fallido con 32 errores/15 warnings; baseline exacto 37 errores/15 warnings. La corrección de tipado redujo tres errores; CI continúa no aprobada.
- No se modificaron dependencias/lockfile, Supabase, RLS, datos, secretos ni producción. No se declara QA aprobado.


## 2026-10-27 — riesgo crítico de Next.js documentado

- La auditoría de dependencias en run 40503354300 sigue reportando 20 vulnerabilidades, incluida una crítica. La versión declarada `next` es 16.1.6. La advisory oficial [GHSA-2464-fhr4-w9xw](https://github.com/vercel/next.js/security/advisories/GHSA-2464-fhr4-w9xw) marca parche desde 16.4.1; la lista oficial de releases muestra 16.4.3 como estable. No se actualizó paquete ni lockfile sin un proceso reproducible de instalación y pruebas.


## 2026-10-27 — tipado incremental de informes

- Commit `d8b9a3f208276c1f7a2e5b8bd38e3629d9ee784e`, archivo `app/informes/page.tsx`.
- Reemplaza dos usos de `any` por tipos locales para los datos de métricas y usa un ID de negocio local tras validar su existencia. Sin cambios intencionales en los cálculos ni consultas.
- Resultado de CI pendiente; no se declara aprobado hasta que lint/build terminen y se lean sus logs.


## 2026-10-27 — corrección de forma de relaciones en informes

- Run [40504213203](https://github.com/Vale-G/turnos-saas/actions/runs/40504213203) falló el build de TypeScript: `servicio` y `staff` se infieren como arrays, incompatibles con el tipo inicial. Lint quedó en 30 errores/15 warnings.
- Commit `d06bfd54987f2d5a4b05606a529d04fc9b38c26f` amplía el tipo a objeto/array/null y normaliza la relación al calcular las métricas. Revalidación pendiente; no se declara aprobado.


## 2026-10-27 — revalidación del fix de informes

- [Run 40504440927](https://github.com/Vale-G/turnos-saas/actions/runs/40504440927): `npm ci` aprobado; build aprobado; lint fallido con 30 errores/15 warnings; baseline exacto 37 errores/15 warnings; auditoría informativa completada.
- La corrección de `app/informes/page.tsx` ahora compila con relaciones Supabase que pueden llegar como arrays. La CI global sigue no aprobada por lint y faltan tests funcionales.


## 2026-10-28 — tipado incremental de bloqueos

- PR #11, rama `codex/ci-automatico-lint-build`, commit `aaaf6e9be257ff546c10be42f8bd0804cf9f8bf6`.
- `app/bloqueos/page.tsx`: reemplazo de tres estados `any` por tipos locales y guard de negocio antes de insertar.
- Pruebas: GitHub Actions pendiente de lectura posterior al commit; no se ejecutaron pruebas funcionales. Sin cambios de RLS/Supabase ni producción.


## 2026-10-28 — resultado CI del fix de bloqueos

- Run [40683854423](https://github.com/Vale-G/turnos-saas/actions/runs/40683854423), sobre el head `0d09ffa964565486cf6d4ae991447bc508422ed1`: instalación y build aprobados; lint fallido con 27 errores/15 warnings; baseline exacto 37 errores/15 warnings.
- La corrección de `app/bloqueos/page.tsx` redujo tres errores de lint. Auditoría reportó 20 vulnerabilidades (1 baja, 6 moderadas, 12 altas, 1 crítica).
- QA independiente fue invocado y sigue sin informe final en la última consulta. No se ejecutaron pruebas funcionales ni se modificaron Supabase, secretos o producción.


## 2026-10-28 — seguimiento QA de bloqueos y primera suite unitaria

- QA detectó dos riesgos estáticos en `app/bloqueos/page.tsx`: ausencia de validación fin > inicio y éxito visual tras un posible error de eliminación. Se corrigieron en la rama `codex/ci-automatico-lint-build`.
- Se agregaron `lib/bloqueos-helpers.mjs`, su declaración `.d.mts` y `tests/bloqueos-helpers.test.mjs` con pruebas de relación staff objeto/array y validación de rangos.
- `package.json`: script `npm test` con `node:test`. `.github/workflows/ci.yml`: job independiente de pruebas unitarias.
- Resultado CI/re-QA de estos cambios: pendiente de ejecución posterior al commit `b3b92b14abc1e92ece7c0cbb8d3eb20233aa8e74`. No se declara validado todavía.
