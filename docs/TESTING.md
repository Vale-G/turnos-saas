# Pruebas y validaciones

## Comandos disponibles

En la raíz del repositorio:

- `npm ci`: instala las dependencias usando `package-lock.json`.
- `npm run lint`: ejecuta ESLint.
- `npm run build`: intenta compilar la aplicación Next.js para producción.
- `npm audit --json`: inspecciona vulnerabilidades declaradas para el lockfile; no actualiza paquetes.

Actualmente `package.json` no declara un script `test`. No hay una suite unitaria, de integración o E2E confirmada.

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
