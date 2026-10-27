# Pruebas y validaciones

## Comandos disponibles

En la raíz del repositorio:

- `npm ci`: instala las dependencias usando `package-lock.json`.
- `npm run lint`: ejecuta ESLint.
- `npm run build`: intenta compilar la aplicación Next.js para producción.

Actualmente `package.json` no declara un script `test`. No hay una suite unitaria, de integración o E2E confirmada.

## Automatización de CI

El workflow [CI - Lint y build](../.github/workflows/ci.yml) se ejecuta en pushes a ramas `codex/**`, en pull requests dirigidos a `codex/revisar-informes-de-turnos-cancelados` y manualmente desde GitHub Actions.

Lint y build ahora son jobs independientes: un fallo de ESLint no debe omitir la compilación. Cada job instala dependencias con `npm ci`; ninguno despliega ni modifica producción o Supabase.

## Último resultado observado antes de separar los jobs

- PR: [#11 — CI: ejecutar lint y build](https://github.com/Vale-G/turnos-saas/pull/11).
- Commit revisado: `f871b0553352dbc0fee8cb2733964d8f0c2b86e8`.
- Ejecución: [run 40411983369](https://github.com/Vale-G/turnos-saas/actions/runs/40411983369).
- `npm ci`: aprobado.
- `npm run lint`: fallido, 37 errores y 15 warnings.
- `npm run build`: omitido porque lint falló en el mismo job.
- `npm ci` informó 20 vulnerabilidades en dependencias (1 baja, 6 moderadas, 12 altas y 1 crítica); todavía no se ha identificado aquí el árbol de dependencias afectado.
- El PR #11 solo cambia el workflow y documentación, no código de aplicación; por ello, los errores de lint observados son deuda previa a este PR. No se ha ejecutado aún una medición directa del lint en el commit base.

**Pendiente:** esperar el workflow nuevo y registrar por separado los resultados de lint y build. No declarar CI aprobada mientras lint falle.

## Limitaciones y estrategia de QA

- Lint y build no reemplazan las pruebas funcionales de reservas, permisos/RLS, pagos y webhooks.
- No usar credenciales, pagos ni datos reales para probar. Los tests de integración requieren mocks, sandbox y un entorno de Supabase aislado.
- No ejecutar migraciones ni pruebas de escritura contra la base activa.
- No usar `npm audit fix --force` ni actualizar dependencias a ciegas.
- Registrar por commit el comando, resultado, vínculo al run y cualquier bloqueo.

## Prioridad de pruebas pendientes

1. Lectura anónima: no revelar filas de `turno` ni campos privados de `negocio`.
2. RLS multiempresa: propietario A no lee ni administra datos de negocio B.
3. Reserva pública: validar servicio, staff, horarios, bloqueos y solapamientos; cubrir concurrencia.
4. Pagos/señas: importe, moneda, referencia, estado, firma e idempotencia.
5. Suscripciones: plan permitido, pago confirmado, trial vigente/vencido y errores.
6. Notificaciones: validación, escape HTML y límites de envío.

Las pruebas de RLS y flujos reales permanecen bloqueadas hasta disponer de un entorno de prueba aislado.
