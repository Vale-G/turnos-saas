# Pruebas y validaciones

## Comandos disponibles

En la raíz del repositorio:

- `npm ci`: instala las dependencias usando `package-lock.json`.
- `npm run lint`: ejecuta ESLint.
- `npm run build`: intenta compilar la aplicación Next.js para producción.
- `npm audit --json`: inspecciona vulnerabilidades declaradas para el lockfile; no actualiza paquetes.

Estado al 2026-10-29: `package.json` declara `npm test` con Node `node:test`; hay cinco pruebas unitarias de helpers puros. No hay suite de integración ni E2E, y las pruebas de RLS están bloqueadas por falta de un sandbox compatible.

## Automatización de CI

El workflow [CI - Lint y build](../.github/workflows/ci.yml) se ejecuta en pushes a ramas `codex/**`, en pull requests dirigidos a `codex/revisar-informes-de-turnos-cancelados` y manualmente desde GitHub Actions.

- Lint y build son jobs independientes; un fallo de ESLint no omite la compilación.
- El job de build usa valores ficticios apuntando a localhost solo para inicializar el cliente público durante prerender. No utiliza credenciales reales ni debe desplegar artefactos.
- En pull requests se ejecuta un baseline informativo de ESLint sobre el SHA base exacto.
- En pull requests también se ejecuta `npm audit --json` como diagnóstico informativo; no actualiza dependencias y no oculta el fallo del job ESLint.

## Evidencia de CI

### Antes de separar los jobs

- Commit: `f871b0553352dbc0fee8cb2733964d8f0c2b86e8`.
- Ejecución: [run 40411983369](https://github.com/Vale-G/turnos-saas/actions/runs/40411983369).
- `npm ci`: aprobado.
- `npm run lint`: fallido, 37 errores y 15 warnings.
- `npm run build`: omitido porque lint falló en el mismo job.
- Instalación informó 20 vulnerabilidades (1 baja, 6 moderadas, 12 altas y 1 crítica). El detalle por paquete está pendiente de la nueva tarea de auditoría.

### Jobs independientes y placeholders locales

- Commit: `06e751192e6438b7c28ffb884a29fd6129e6173e`.
- Ejecución: [run 40500358257](https://github.com/Vale-G/turnos-saas/actions/runs/40500358257).
- `npm ci`: aprobado en ambos jobs.
- `npm run lint`: fallido con 37 errores y 15 warnings.
- `npm run build`: aprobado con placeholders públicos ficticios de localhost; no se usaron credenciales reales.

### Baseline exacto de la rama base

- Ejecución: [run 40500691882](https://github.com/Vale-G/turnos-saas/actions/runs/40500691882).
- SHA base exacto: `07bd2ee75b16e91a3d31f63b60cf7d8796d614cf`.
- **Base: 37 errores y 15 warnings. PR antes del fix: 37 errores y 15 warnings.** La deuda de lint inicial ya estaba en la base.

### Limpieza incremental de lint

- Fix: commit `20485a0fe924d71a292fcc9d8bf1e0cb160a096f`, archivo `app/terminos/page.tsx`.
- Cambio: escapar dos comillas en el texto JSX con `&quot;`, sin alterar texto visible ni lógica.
- Validación: [run 40501240344](https://github.com/Vale-G/turnos-saas/actions/runs/40501240344).
- `npm ci`: aprobado en los tres jobs.
- `npm run build`: aprobado.
- `npm run lint` en el PR: 35 errores y 15 warnings.
- Baseline en la base exacta: 37 errores y 15 warnings.
- Repetición del head documental: [run 40501476049](https://github.com/Vale-G/turnos-saas/actions/runs/40501476049), mismo resultado.
- Resultado: el fix quitó dos errores JSX y no agregó errores nuevos.

### Auditoría detallada de dependencias

La tarea informativa de `npm audit --json` se acaba de agregar al workflow para identificar paquetes, severidad, rangos afectados y disponibilidad de corrección. El primer reporte queda pendiente. No ejecutar `npm audit fix --force` ni actualizar dependencias a ciegas.

## Limitaciones y estrategia de QA

- Lint y build no reemplazan las pruebas funcionales de reservas, permisos/RLS, pagos y webhooks.
- No usar credenciales, pagos ni datos reales para probar. Los tests de integración requieren mocks, sandbox y un entorno de Supabase aislado.
- No ejecutar migraciones ni pruebas de escritura contra la base activa.
- Registrar por commit el comando, resultado, vínculo al run y cualquier bloqueo.

## Prioridad de pruebas pendientes

1. Lectura anónima: no revelar filas de `turno` ni campos privados de `negocio`.
2. RLS multiempresa: propietario A no lee ni administra datos de negocio B.
3. Reserva pública: validar servicio, staff, horarios, bloqueos y solapamientos; cubrir concurrencia.
4. Pagos/señas: importe, moneda, referencia, estado, firma e idempotencia.
5. Suscripciones: plan permitido, pago confirmado, trial vigente/vencido y errores.
6. Notificaciones: validación, escape HTML y límites de envío.

Las pruebas de RLS y flujos reales permanecen bloqueadas hasta disponer de un entorno de prueba aislado.


### Seguimiento 2026-10-27 — run 40502014733 y fix incremental

- Run: [40502014733](https://github.com/Vale-G/turnos-saas/actions/runs/40502014733), ejecutado sobre el merge ref del PR #11 cuyo head examinado era `e0a07fa73ac2e240d9261324fffad59f0ff42f5e`.
- `npm ci`: aprobado en los jobs que lo ejecutaron.
- `npm run build`: aprobado; compiló 32 páginas con placeholders ficticios locales. Esto no prueba los flujos de negocio.
- `npm run lint`: fallido, 35 errores y 15 warnings; el baseline de la rama base también falló. El baseline no es un gate de aprobación.
- `npm audit --json`: ejecutado. El informe reporta 20 vulnerabilidades (1 baja, 6 moderadas, 12 altas y 1 crítica); Next.js aparece en varios avisos, incluidos rangos críticos. No se cambiaron dependencias porque no hay un lockfile regenerado por npm ni prueba de compatibilidad en este entorno.
- Fix incremental posterior: `app/servicios/page.tsx` reemplaza tres usos de `any` por tipos locales de negocio/servicio y convierte precio/duración/importe de seña a string al poblar inputs; añade un guard para evitar guardar si falta el negocio. No se alteró el flujo normal de guardar servicios.
- Run [40503354300](https://github.com/Vale-G/turnos-saas/actions/runs/40503354300), head `442650520caec2ef6a1c45632a7519e0b71c428f`: `npm ci` aprobado; build aprobado; lint fallido con **32 errores y 15 warnings**. Baseline exacto de la rama base: **37 errores y 15 warnings**. El cambio en `app/servicios/page.tsx` redujo tres errores sin desactivar reglas. La CI global continúa fallida.
- No se ejecutaron tests unitarios, integración ni E2E. El aislamiento RLS, reservas, pagos y webhooks sigue bloqueado por falta de un entorno Supabase de prueba.


### Resultado confirmado del fix de tipado — 2026-10-27

- Run [40503354300](https://github.com/Vale-G/turnos-saas/actions/runs/40503354300): build **APROBADO**; lint **FALLIDO** con 32 errores/15 warnings; baseline de la base 37 errores/15 warnings; auditoría informativa ejecutada y mantiene 20 vulnerabilidades.
- Fix `app/servicios/page.tsx` redujo el total del PR de 35 a 32 errores. Los errores restantes siguen bloqueando la CI.
- QA independiente fue invocado inmediatamente tras el cambio; el resultado de esa ejecución aún no se había recibido al actualizar este archivo.


### QA de respaldo — 2026-10-27 — head documental `21d69c58673b223c7ddbcec134501bf1d3f7280b`

- La última modificación de código examinada sigue siendo el tipado incremental de `app/servicios/page.tsx`; los commits posteriores de esta validación solo actualizan documentación. No se repitió QA funcional de negocio porque no hay un nuevo diff de runtime.
- Revalidación de continuidad: [run 40503627422](https://github.com/Vale-G/turnos-saas/actions/runs/40503627422), sobre el head documental indicado.
- `npm ci`: aprobado.
- `npm run build`: aprobado; se generaron las 32 páginas estáticas con placeholders ficticios locales.
- `npm run lint`: fallido, **32 errores y 15 warnings**.
- Baseline exacto `07bd2ee75b16e91a3d31f63b60cf7d8796d614cf`: **37 errores y 15 warnings**. La reducción de cinco errores se mantiene y no hay aumento de warnings.
- `npm audit --json`: 20 vulnerabilidades (1 baja, 6 moderadas, 12 altas y 1 crítica). El paquete directo `next@16.1.6` está en el rango vulnerable reportado; npm indica `16.4.3` como versión de corrección disponible. No se actualizaron dependencias.
- El run confirma que los commits documentales no introdujeron regresiones de lint/build; **no aprueba la CI global** porque el gate de lint continúa fallando.
- No existen tests unitarios/integración/E2E ni un entorno de Supabase aislado confirmado. Reservas, RLS, concurrencia, pagos/webhooks e trial continúan **BLOQUEADOS/NO PROBADOS**.
- P0 de acceso público a filas de turnos y campos privados/token potencialmente expuesto sigue sin mitigación. P1 de pagos, webhooks, aislamiento por negocio y notificaciones sigue pendiente.

No se hizo merge, despliegue, migración, cambio de RLS, escritura en la base activa ni modificación de secretos. Próximas acciones: corregir lint incrementalmente, planificar actualización coordinada de `next`/`eslint-config-next` y validar los flujos críticos en un entorno aislado.


### Fix incremental siguiente — 2026-10-27

- Commit de código: `d8b9a3f208276c1f7a2e5b8bd38e3629d9ee784e`, archivo `app/informes/page.tsx`.
- Se agregaron tipos locales para negocio y filas de métricas, y se capturó `negocioId` antes de las consultas/realtime para evitar usos de `any` y accesos no estrechados. El cambio pretende eliminar dos errores de lint sin cambiar cálculos ni consultas de negocio.
- CI y revisión QA del nuevo head aún pendientes; no afirmar que el cambio pasó hasta comprobar build y lint. No se añadieron pruebas funcionales porque no existe suite configurada.


### Regresión detectada y corrección — 2026-10-27

- Run [40504213203](https://github.com/Vale-G/turnos-saas/actions/runs/40504213203) probó el tipado inicial de `app/informes/page.tsx`: lint bajó a 30 errores/15 warnings, pero **build falló** porque Supabase devuelve las relaciones `servicio` y `staff` como arrays, no como objetos únicos.
- La causa quedó identificada en el log TypeScript de `app/informes/page.tsx:70`. Se corrigió en commit `d06bfd54987f2d5a4b05606a529d04fc9b38c26f` permitiendo relaciones como objeto o array y tomando el primer registro cuando llega un array. Esto también hace que los cálculos de informes lean el resultado de la relación array.
- La corrección es una hipótesis de arreglo hasta que un nuevo run confirme build y lint. No se declara aprobado todavía.


### Revalidación de la normalización de relaciones — 2026-10-27

- Run [40504440927](https://github.com/Vale-G/turnos-saas/actions/runs/40504440927) terminó para el head documental `e89d3b2d0c5fb8be6f157e624c424b789c85335b`, que incluye el fix de código `d06bfd54987f2d5a4b05606a529d04fc9b38c26f`.
- `npm ci`: aprobado; build: **APROBADO**; lint: **FALLIDO**, 30 errores y 15 warnings; baseline exacto: 37 errores y 15 warnings; auditoría informativa ejecutada.
- El build ya pasa tras admitir relaciones Supabase como objeto o array. La CI global sigue fallando por lint; no se desactivaron reglas.
- La revisión QA independiente fue solicitada de nuevo para este ciclo; su estado/resultado debe comprobarse por separado.


### Fix incremental de tipos en bloqueos — 2026-10-28

- Rama: `codex/ci-automatico-lint-build`; PR #11; commit de código `aaaf6e9be257ff546c10be42f8bd0804cf9f8bf6`.
- Archivo: `app/bloqueos/page.tsx`. Se reemplazaron tres estados `any` por tipos locales para negocio, staff y bloqueos; se contempló la relación `staff` como objeto o array y se añadió un guard si no hay negocio antes de crear un bloqueo.
- Intención: eliminar tres errores `no-explicit-any` sin cambiar consultas ni permisos. No es una corrección de RLS; las políticas de bloqueo siguen pendientes.
- Validación posterior al commit: pendiente de la ejecución de GitHub Actions. No afirmar que lint/build pasan hasta leer el run más reciente.
- No se ejecutaron pruebas funcionales ni escrituras en Supabase. No se modificó producción.


### Resultado CI — 2026-10-28 — run 40683854423

- Commit comprobado: `0d09ffa964565486cf6d4ae991447bc508422ed1`; PR #11, rama `codex/ci-automatico-lint-build`.
- `npm ci`: aprobado; `npm run build`: **APROBADO**; `npm run lint`: **FALLIDO**, 27 errores y 15 warnings.
- Baseline de la rama base exacta `07bd2ee75b16e91a3d31f63b60cf7d8796d614cf`: 37 errores y 15 warnings. La corrección de `app/bloqueos/page.tsx` redujo tres errores; no se desactivaron reglas.
- `npm audit`: 20 vulnerabilidades reportadas (1 baja, 6 moderadas, 12 altas, 1 crítica). No se actualizaron dependencias.
- QA independiente se solicitó tras el cambio; la última consulta lo mantenía en curso. Resultado final de QA: pendiente.
- No hay pruebas unitarias/integración/E2E configuradas/ejecutadas ni entorno Supabase aislado confirmado. Los riesgos P0 de RLS/lectura pública y P1 de pagos siguen sin mitigación.


### Seguimiento QA y pruebas unitarias de bloqueos — 2026-10-28

- QA independiente del head `0d09ffa964565486cf6d4ae991447bc508422ed1` concluyó **NO APROBADO**: build aprobado, lint 27 errores/15 warnings, sin pruebas funcionales. Hallazgos reproducibles estáticos: el formulario no validaba fin > inicio y la eliminación mostraba éxito sin comprobar el error de Supabase.
- Corrección posterior en `app/bloqueos/page.tsx`: se valida el rango horario antes de insertar; la eliminación solo actualiza la UI y muestra éxito si Supabase no devuelve error; la relación staff se normaliza mediante helper puro.
- Nuevos archivos: `lib/bloqueos-helpers.mjs`, `lib/bloqueos-helpers.d.mts`, `tests/bloqueos-helpers.test.mjs`. Cobertura: relación como objeto/array/vacía/nula y rango horario válido/invertido/igual/formato inválido.
- Se agregó `npm test` usando `node:test` sin dependencias nuevas y job separado `unit-tests` en `.github/workflows/ci.yml`.
- Validación de esta corrección: pendiente del run CI posterior al commit `b3b92b14abc1e92ece7c0cbb8d3eb20233aa8e74` y del re-QA independiente. No declarar aprobados los tests hasta leer los logs.
- No se ejecutaron escrituras en Supabase; RLS y aislamiento entre negocios siguen sin probarse.


### Resultado de la suite unitaria y re-QA — 2026-10-28

- Run [40684537949](https://github.com/Vale-G/turnos-saas/actions/runs/40684537949), head `2e10b20ab6efe8173d70a517fd9e7e08ba97793a`: instalación aprobada, build aprobado y **5/5 pruebas unitarias aprobadas**. El job ESLint falló con 27 errores/15 warnings; el baseline exacto de la base fue 37 errores/15 warnings. Auditoría: 20 vulnerabilidades (1 baja, 6 moderadas, 12 altas, 1 crítica).
- La suite cubre helpers puros; no prueba el endpoint, la autorización ni la escritura real de bloqueos. El test de UI/DB sigue bloqueado por ausencia de Supabase aislado.
- QA independiente fue invocado tras el cambio de validación horaria y manejo de errores; el informe de esa segunda ejecución todavía no estaba disponible al actualizar este registro.
- No se modificó Supabase, RLS, datos, secretos ni producción. CI global sigue **NO APROBADA** por ESLint.


### QA de respaldo — 2026-10-28 — head `e2641b68454676b17002481bcd40e278afdd64cb`

- PR #11 continúa abierto, en borrador y sin fusionar. Base `codex/revisar-informes-de-turnos-cancelados` @ `07bd2ee75b16e91a3d31f63b60cf7d8796d614cf`; rama de trabajo `codex/ci-automatico-lint-build`.
- El único cambio desde el head previamente probado es documental: `docs/SUPABASE_SANDBOX_REVIEW.md`. No hay nuevo cambio de runtime, por lo que no se repitió la batería funcional de la app.
- CI del head actual: [run 40691251109](https://github.com/Vale-G/turnos-saas/actions/runs/40691251109).
  - `npm ci`: aprobado.
  - `npm test`: **5/5 aprobadas**, 0 fallos (helpers puros de bloqueos).
  - `npm run build`: aprobado.
  - `npm run lint`: **fallido, 27 errores y 15 warnings**.
  - Baseline exacto de la base: **37 errores y 15 warnings**.
  - `npm audit`: 20 vulnerabilidades (1 baja, 6 moderadas, 12 altas y 1 crítica).
- La documentación del sandbox `Tunero 2` fue contrastada con el conector Supabase en modo de solo lectura. Proyecto `hwrlimcunbenxsvfbklr`, estado `ACTIVE_HEALTHY`, PostgreSQL 17. Se encontraron cuatro tablas públicas (`negocios`, `perfiles`, `turnos`, `lista_negra`), todas con RLS habilitado y cero filas. El listado de migraciones no devolvió registros.
- El esquema no es compatible con el Turnly documentado (`negocio`, `turno`, `bloqueo`, `bloquehorario`, `servicio`, `staff`); no usar este proyecto para probar la app hasta reconciliar el esquema mediante una fuente de verdad revisada.
- Metadatos de políticas del sandbox: `perfiles` tiene RLS sin políticas; las otras tres tablas tienen políticas `FOR ALL` aplicadas a `public` con predicados de propiedad. `WITH CHECK` figura como nulo, lo que por sí solo no demuestra bypass (PostgreSQL puede reutilizar `USING` como check); aun así, deben probarse INSERT/UPDATE con roles aislados. El advisor informa que las cuatro tablas son visibles a través del esquema GraphQL para `anon` y `authenticated`; la visibilidad no demuestra por sí sola acceso a filas. La función `public.rls_auto_enable()` es `SECURITY DEFINER` y ejecutable por `anon` y `authenticated`; no se ejecutó ni se inspeccionó su cuerpo.
- Resultado: CI global **NO APROBADA** por lint. Seguridad funcional de Turnly y pruebas de reservas/RLS/pagos **BLOQUEADAS** hasta tener un sandbox compatible y revisar el acceso de la función privilegiada. No se hicieron escrituras, migraciones, cambios de RLS ni cambios de secretos.


## Evidencia actualizada — 2026-10-29

- Rama de trabajo: `codex/ci-automatico-lint-build`; head comprobado `88d146a80c7bcef89632bae2e00539ddea458a3b`; PR #11 abierto y en borrador.
- Run [40779968499](https://github.com/Vale-G/turnos-saas/actions/runs/40779968499): `npm ci` aprobado; `npm test` aprobado con 5/5; `npm run build` aprobado; `npm run lint` fallido con 27 errores/15 warnings; baseline exacto de la rama base: 37 errores/15 warnings; auditoría informativa: 20 vulnerabilidades (1 baja, 6 moderadas, 12 altas, 1 crítica).
- Interpretación: el trabajo previo redujo la deuda de lint frente a la base, pero la CI obligatoria sigue fallando. La compilación no valida permisos ni flujos funcionales.
- Revisión de la página pública en la rama estable: `app/reservar/[slug]/page.tsx` realiza lecturas directas de negocio/turnos y una inserción directa de turno desde el navegador. La exposición P0 no está contenida.
- Bloqueo de integración: `Tunero 2` está activo, pero su esquema no coincide con el de Turnly; no ejecutar migraciones ni pruebas de escritura hasta disponer de fuente de verdad y plan revisado.


### Run confirmado — 2026-10-29 — commit documental d9f3232

- Run [40862792874](https://github.com/Vale-G/turnos-saas/actions/runs/40862792874): instalación de dependencias aprobada; `npm test` 5/5; build aprobado; lint fallido con 27 errores/15 warnings.
- Los jobs de baseline y auditoría se omitieron en el evento `push`. Para baseline y vulnerabilidades usar el run de PR [40779968499](https://github.com/Vale-G/turnos-saas/actions/runs/40779968499): base 37 errores/15 warnings; auditoría 20 vulnerabilidades (1 crítica).
- El commit probado contiene documentación únicamente. No valida la seguridad funcional de reservas ni RLS.


## 2026-10-29 — pruebas de generación de horarios de reserva

- Cambio en `app/reservar/[slug]/page.tsx`: se extrajo el cálculo de franjas a `lib/reserva-disponibilidad.mjs` (declaraciones `.d.mts`) y se añadieron `tests/reserva-disponibilidad.test.mjs`.
- Los ocho casos nuevos verifican cierre de jornada, duración inválida, bloqueos parciales, horas ocupadas dentro de una franja, límite para hoy y formatos inválidos. `npm test` ejecuta también los cinco casos previos de bloqueos.
- **Validación:** pendiente de leer los jobs del workflow sobre el commit de código `a1d4a70b8f3e42074d3e001e6b6bda8137d82cae` o un descendiente que lo incluya. No atribuir a este cambio resultados de CI anteriores.
- **Límite de seguridad:** este cálculo solo filtra opciones en el navegador. La consulta de turnos existente no incluye duración del servicio previo, por lo que no puede detectar todos los solapamientos; tampoco resuelve concurrencia, autorización, RLS, ni validación server-side. No tratarlo como mitigación del P0.
