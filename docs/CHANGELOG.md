## 2026-11-10 — Validación conservadora de lista negra vacía

- Base estable intacta: `codex/revisar-informes-de-turnos-cancelados` @ `07bd2ee75b16e91a3d31f63b60cf7d8796d614cf`. Rama aislada `codex/fix-blacklist-empty-config-20261110`, creada desde el head de trabajo `9013bf0c95fdbf340f424a94e51a5e3ad0add18a` (PR #11 borrador); **no** se fusionó al PR #11.
- `lib/reserva-lista-negra.mjs`: distingue ausencia de fila de configuración (permitida por comportamiento previo) de fila presente con valor vacío, nulo o de tipo inválido (rechazada como configuración corrupta). Commit `210ee25794e764dcb7005e4d37eec545b2d83290`.
- `tests/reserva-lista-negra.test.mjs`: regresión para `''`, `null` y `undefined`. Commit `f58629e487011ba68a6bc1565b67d89165454195`.
- Validación CI de este head: pendiente de consultar; no atribuir a esta rama resultados del PR #11. Seguridad P0 y experiencia de teléfono autenticado siguen abiertas; sin integración/E2E ni pruebas de aislamiento. No desplegar ni fusionar.

## 2026-11-06 — Lista negra: helper verificable y regresiones

- Base estable: `codex/revisar-informes-de-turnos-cancelados` @ `07bd2ee75b16e91a3d31f63b60cf7d8796d614cf` (sin cambios); trabajo en `codex/ci-automatico-lint-build`, PR #11 borrador.
- `lib/reserva-lista-negra.mjs` y `.d.mts`: extracción de parseo conservador de configuración y comparación normalizada de teléfonos. `app/reservar/[slug]/page.tsx` utiliza ahora el helper. `tests/reserva-lista-negra.test.mjs`: cinco pruebas nuevas para JSON inválido, tipos incorrectos, lista vacía, normalización y coincidencias.
- Commits de implementación: `dcc5771`, `315a80f`, `a5a9248`, `a4b61ee`. No se alteraron los permisos ni los datos de Supabase.
- Validación de CI del nuevo head: pendiente de inspección. El run anterior [42016776355](https://github.com/Vale-G/turnos-saas/actions/runs/42016776355) terminó con build y pruebas unitarias aprobadas, ESLint fallido; no atribuir ese resultado a estos cambios.
- Riesgos abiertos: excepciones de red no capturadas en la consulta de lista negra; reserva insertada desde navegador sin control transaccional, RLS pública, concurrencia y aislamiento. No hay integración/E2E ni QA independiente aprobado. Sin merge ni despliegue.

## 2026-11-03 — Correcciones puntuales de hallazgos QA en reservas

- Base estable: `codex/revisar-informes-de-turnos-cancelados` @ `07bd2ee75b16e91a3d31f63b60cf7d8796d614cf` (sin cambios). Rama: `codex/ci-automatico-lint-build`; PR #11 borrador.
- QA 30/10 detectó segundos ignorados en bloqueos y selección de horario obsoleta al cambiar de servicio (comentario #6521584332 del PR).
- `lib/reserva-disponibilidad.mjs`: rechaza horarios con segundos distintos de cero, porque el filtro de UI opera a resolución de minutos; decisión conservadora fail-closed. Commit `3ba7a50e516719b7ee0b71d518dc3eee6dbba205`.
- `tests/reserva-disponibilidad.test.mjs`: regresión de bloqueos/turnos con segundos y compatibilidad con segundos cero. Commit `7bc331b875da7dc55049736b30ae386a2480ce45`.
- `app/reservar/[slug]/page.tsx`: al cambiar servicio limpia profesional/fecha/hora; botón Continuar y confirmación exigen horario perteneciente a las opciones vigentes de UI. Commits `ac158dba2cf94f67fbf75c3796e21164fedbc974` y `a132d1fe80f8c46c58b40e8a236c3ab29fef1c41`.
- Pruebas: CI de GitHub Actions pendiente de verificar sobre el último commit; no afirmar aprobación. Los cambios de UI no mitigan P0: RLS pública, creación transaccional y concurrencia siguen abiertos. No hay integración/E2E ni sandbox compatible. Sin merge, deploy, migraciones, secretos o escrituras en producción.

# Changelog técnico

## 2026-11-02 — Límite temporal de reserva: fallo seguro

- Rama: `codex/ci-automatico-lint-build`; PR #11 en borrador; base estable `07bd2ee75b16e91a3d31f63b60cf7d8796d614cf` (no modificada).
- Código: `lib/reserva-disponibilidad.mjs` devuelve cero horarios si `minLimite` es inválido, no finito, negativo o mayor a 1440, en vez de asumir 0 y potencialmente ofrecer horarios pasados. Commit `2b2368faa34cc5905c91d4b15eaf750b4f100a9b`.
- Tests: `tests/reserva-disponibilidad.test.mjs` agrega regresión para `NaN`, `Infinity`, negativos, fuera de rango, `null` y string. Commit `acfe5163341b37aa17b5ca62f5d1256d453c310d`.
- Validación: pendiente de inspeccionar el nuevo run de GitHub Actions; no afirmar checks aprobados hasta comprobarlos. Esta es solo una protección de interfaz, no una validación transaccional.
- P0 abierto: lectura pública de reservas/tokens, RLS, reserva server-side y concurrencia. No se tocó Supabase, pagos, producción ni credenciales.


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


## 2026-10-28 — resultado de pruebas unitarias

- Run [40684537949](https://github.com/Vale-G/turnos-saas/actions/runs/40684537949): build aprobado; pruebas unitarias 5/5 aprobadas; ESLint fallido con 27 errores/15 warnings; baseline 37 errores/15 warnings; auditoría 20 vulnerabilidades (1 crítica).
- Los tests ejercitan helpers puros, no la persistencia ni permisos reales. QA independiente de la corrección posterior sigue pendiente de informe final.
- Sin cambios en Supabase, secretos ni producción; PR #11 sigue en borrador.


## 2026-10-29 — verificación de puerta P0 y CI

- Rama: `codex/ci-automatico-lint-build`; head examinado antes de esta actualización: `88d146a80c7bcef89632bae2e00539ddea458a3b`; PR #11 sigue en borrador y sin fusionar.
- Verificación Vercel: deployment de producción `READY` en `bc234fb0b8c981935602168ca0b6982d24d0956f`; punta de rama estable `07bd2ee75b16e91a3d31f63b60cf7d8796d614cf`. Sin despliegue nuevo.
- Run [40779968499](https://github.com/Vale-G/turnos-saas/actions/runs/40779968499): build aprobado; tests 5/5 aprobados; lint fallido (27 errores/15 warnings, baseline 37/15); auditoría reporta 20 vulnerabilidades.
- Inspección estática confirma lecturas de `negocio` y `turno` e inserción de reservas desde `app/reservar/[slug]/page.tsx`.
- `Tunero 2` está activo pero no es compatible con el esquema esperado; función `rls_auto_enable()` ejecutable por roles públicos. No se ejecutó la función ni se hicieron cambios de base.
- Cambios de esta jornada: solo documentación/evidencia; no se modificó runtime, base de datos, políticas, secretos ni producción. No equivale a QA aprobado.


## 2026-10-29 — resultado CI del commit d9f3232

- Run [40862792874](https://github.com/Vale-G/turnos-saas/actions/runs/40862792874): build aprobado; tests unitarios 5/5; lint fallido con 27 errores/15 warnings.
- Los jobs informativos de baseline y audit se omitieron porque el evento fue `push`. Evidencia previa de PR [40779968499](https://github.com/Vale-G/turnos-saas/actions/runs/40779968499): baseline 37 errores/15 warnings y 20 vulnerabilidades (1 crítica).
- Este run cubre el commit documental `d9f32322e14a4b3412d3e8f4df166fc653c08993`, no agrega pruebas funcionales y no cambia el veredicto de seguridad.


## 2026-10-29 — corrección incremental de franjas de reserva (sin deploy)

- Rama `codex/ci-automatico-lint-build`, PR #11 en borrador; commit de código `a1d4a70b8f3e42074d3e001e6b6bda8137d82cae`. Base estable `07bd2ee75b16e91a3d31f63b60cf7d8796d614cf`, sin cambios.
- Se reemplazó el generador de horarios de `app/reservar/[slug]/page.tsx` por un helper puro, con declaración de tipos y ocho pruebas unitarias nuevas. Evita ofrecer una franja que termine después del cierre, atraviese un bloqueo parcial o tenga duración inválida.
- No se cambiaron consultas Supabase, políticas, migraciones, pagos, credenciales ni datos reales.
- Validación de GitHub Actions: pendiente del run correspondiente al head con este cambio. El último head previo `e031ea4` tenía build y cinco pruebas aprobados, pero lint fallido con 27 errores/15 warnings; no reutilizarlo como prueba de esta corrección.
- P0 continúa abierto: consultas públicas directas, ausencia de validación transaccional, duración de turnos existentes desconocida y RLS sin prueba aislada. QA independiente pendiente.


## 2026-10-30 — intervalos ocupados y fallos cerrados (PR #11)

- En `app/reservar/[slug]/page.tsx`, consulta de turnos con duración del servicio relacionado; ante error de consulta, no se muestran horarios. En `lib/reserva-disponibilidad.mjs` y su declaración TS, comparación de intervalos completos y rechazo conservador de bloqueos/ocupaciones inválidos. Se amplió `tests/reserva-disponibilidad.test.mjs` con regresiones de QA.
- `docs/SECURITY.md`: auditoría de metadatos RLS, grants y funciones privilegiadas del Día 5, sin leer datos ni cambiar políticas.
- Rama: `codex/ci-automatico-lint-build`; base `codex/revisar-informes-de-turnos-cancelados` @ `07bd2ee75b16e91a3d31f63b60cf7d8796d614cf`; PR #11 draft. Commit y checks: consultar el historial del PR y `docs/TESTING.md` al completarse CI.
- Sin cambios en producción, SQL, migraciones, secrets ni pagos. QA independiente y pruebas funcionales pendientes.


### Validación y ajuste de reintento — 2026-10-30

- Commits: `84abdf7fff0ed4a2ac6e078e4b57b6a601dd113a` (helper, tests, UI y auditoría), `2a51690e46296b08a9809f9976ed95384712ac4c` (fixture de duraciones mixtas), `97fb8b96804b8788e225a36ddc66c80bb6acfd90` (carga inmediata y reintento de consulta al seleccionar fecha).
- Evidencia: [CI 41048104243](https://github.com/Vale-G/turnos-saas/actions/runs/41048104243), 17/17 tests y build aprobados; lint fallido 26 errores/15 warnings; 20 vulnerabilidades. QA y pruebas funcionales pendientes.


## 2026-11-05 — manejo defensivo de lista negra (PR #11)

- Rama: `codex/ci-automatico-lint-build`; base estable `codex/revisar-informes-de-turnos-cancelados` @ `07bd2ee75b16e91a3d31f63b60cf7d8796d614cf`. Commit de código: `5791338d349c7f89231ea9d7ec453d42f6801f07`.
- Archivo: `app/reservar/[slug]/page.tsx`. Se captura JSON inválido de la configuración de lista negra y se valida que sea un array de cadenas; si no es válido, se rechaza la operación con mensaje controlado y se restablece `confirmando`. No se omite la lista negra ante error.
- Evidencia anterior: [CI 41627028889](https://github.com/Vale-G/turnos-saas/actions/runs/41627028889) falló globalmente por lint; 19 tests unitarios y build aprobados según revisión previa. **No atribuir esa evidencia al cambio actual**. Revisar CI del nuevo commit antes de afirmar resultados.
- Límites: no hay prueba de integración de configuración inválida ni validación server-side; la consulta de `config` sigue en el navegador. P0 de privacidad y concurrencia sigue abierto. No se tocó producción, base de datos, pagos ni permisos.

- Corrección adicional de QA (2026-11-05): commit `c4948d7b4c0e9a8e8d403f05e4939bb228b93841` en `app/reservar/[slug]/page.tsx`; si Supabase devuelve error consultando la lista negra, la reserva se rechaza y se restablece el estado de confirmación. Falta manejar posibles excepciones de red fuera del objeto `error`, pruebas automatizadas de integración y re-QA del commit. Sin deploy.


## 2026-11-09 — validación defensiva de lista negra (PR #11, sin despliegue)

- Base estable: `codex/revisar-informes-de-turnos-cancelados` @ `07bd2ee75b16e91a3d31f63b60cf7d8796d614cf`, intacta. Rama de trabajo: `codex/ci-automatico-lint-build`.
- `lib/reserva-lista-negra.mjs`: función asíncrona `verificarListaNegra` que rechaza errores de consulta, excepciones de red, JSON corrupto, teléfonos bloqueados y ausencia de teléfono cuando existe una lista no vacía. `app/reservar/[slug]/page.tsx`: consume el resultado y restablece `confirmando` al fallar. `lib/reserva-lista-negra.d.mts`: firma compatible con consultas thenable de Supabase.
- `tests/reserva-lista-negra.test.mjs`: cuatro pruebas de regresión adicionales para excepciones, errores Supabase, teléfono ausente y ausencia de lista.
- Commits: `0ca0d3c`, `c230500`, `3bbcd06`, `be49302`, `a17695a`. Verificar CI sobre el head posterior a estos commits antes de afirmar resultados.
- Limitaciones: un cliente autenticado sin teléfono y con lista no vacía ahora recibe un mensaje para contactar al local; se necesita definir captura de teléfono y validación server-side. La lista negra aún se consulta desde navegador; el riesgo P0 de RLS, datos privados y reserva concurrente sigue abierto. No se tocaron datos, políticas, secretos ni producción.
