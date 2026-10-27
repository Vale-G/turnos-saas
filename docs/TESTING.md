# Pruebas y validaciones

## Comandos disponibles

En la raíz del repositorio:

- `npm ci`: instala las dependencias usando `package-lock.json`.
- `npm run lint`: ejecuta ESLint.
- `npm run build`: intenta compilar la aplicación Next.js para producción.

Actualmente `package.json` no declara un script `test`. No hay una suite unitaria, de integración o E2E confirmada.

## Automatización de CI

El workflow [CI - Lint y build](../.github/workflows/ci.yml) se ejecuta en pushes a ramas `codex/**`, en pull requests dirigidos a `codex/revisar-informes-de-turnos-cancelados` y manualmente desde GitHub Actions.

- Lint y build son jobs independientes; un fallo de ESLint no omite la compilación.
- El job de build usa valores ficticios apuntando a localhost solo para inicializar el cliente público durante prerender. No utiliza credenciales reales ni debe desplegar artefactos.
- En pull requests se ejecuta un baseline informativo de ESLint sobre el SHA base exacto. El job ESLint del PR sigue siendo el control obligatorio y no se neutralizan sus fallos.

## Evidencia de CI

### Antes de separar los jobs

- PR: [#11 — CI: ejecutar lint y build](https://github.com/Vale-G/turnos-saas/pull/11).
- Commit: `f871b0553352dbc0fee8cb2733964d8f0c2b86e8`.
- Ejecución: [run 40411983369](https://github.com/Vale-G/turnos-saas/actions/runs/40411983369).
- `npm ci`: aprobado.
- `npm run lint`: fallido, 37 errores y 15 warnings.
- `npm run build`: omitido porque lint falló en el mismo job.
- Instalación informó 20 vulnerabilidades en dependencias (1 baja, 6 moderadas, 12 altas y 1 crítica). Todavía no se ha identificado aquí el árbol de dependencias afectado.

### Jobs independientes y placeholders locales

- Commit: `06e751192e6438b7c28ffb884a29fd6129e6173e`.
- Ejecución: [run 40500358257](https://github.com/Vale-G/turnos-saas/actions/runs/40500358257).
- `npm ci`: aprobado en ambos jobs.
- `npm run lint`: fallido con 37 errores y 15 warnings.
- `npm run build`: aprobado. Next.js compiló y terminó el build con placeholders públicos ficticios de localhost; no se usaron credenciales reales.
- El build anterior había fallado en prerender de `/clientes` y `/registro-negocio` por variables públicas ausentes. Los placeholders corrigieron ese bloqueo de CI sin cambiar el runtime.
- El PR no modifica código de aplicación. La nueva tarea `baseline-lint` medirá el resultado en el SHA base exacto; su primera ejecución queda pendiente.

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
