# Pruebas y validaciones

## Comandos disponibles

En la raíz del repositorio:

- `npm ci`: instala las dependencias usando `package-lock.json`.
- `npm run lint`: ejecuta ESLint.
- `npm run build`: intenta compilar la aplicación Next.js para producción.

Actualmente `package.json` no declara un script `test`. No hay una suite unitaria, de integración o E2E confirmada.

## Automatización de CI

El workflow [CI - Lint y build](../.github/workflows/ci.yml) se ejecuta en pushes a ramas `codex/**`, en pull requests dirigidos a `codex/revisar-informes-de-turnos-cancelados` y manualmente desde GitHub Actions.

Lint y build son jobs independientes; un fallo de ESLint no debe omitir la compilación. Cada job instala dependencias con `npm ci`. El job de build usa únicamente valores ficticios locales para inicializar el cliente público durante prerender; no utiliza credenciales reales ni debe desplegar artefactos.

## Evidencia de CI

### Antes de separar los jobs

- PR: [#11 — CI: ejecutar lint y build](https://github.com/Vale-G/turnos-saas/pull/11).
- Commit: `f871b0553352dbc0fee8cb2733964d8f0c2b86e8`.
- Ejecución: [run 40411983369](https://github.com/Vale-G/turnos-saas/actions/runs/40411983369).
- `npm ci`: aprobado.
- `npm run lint`: fallido, 37 errores y 15 warnings.
- `npm run build`: omitido porque lint falló en el mismo job.
- Instalación informó 20 vulnerabilidades en dependencias (1 baja, 6 moderadas, 12 altas y 1 crítica). Todavía no se ha identificado aquí el árbol de dependencias afectado.

### Primera ejecución con jobs independientes

- Commit: `ac581183ede93a229f110fa23e53f2ab67fae63d`.
- Ejecución: [run 40500059792](https://github.com/Vale-G/turnos-saas/actions/runs/40500059792).
- `npm ci`: aprobado en ambos jobs.
- `npm run lint`: fallido con los mismos 37 errores y 15 warnings.
- `npm run build`: fallido durante el prerender de `/clientes` y `/registro-negocio`, porque el entorno CI no definía `NEXT_PUBLIC_SUPABASE_URL` ni `NEXT_PUBLIC_SUPABASE_ANON_KEY`. La compilación de Next.js y TypeScript había terminado antes de ese error.
- El PR solo cambia workflow y documentación, no código de aplicación; los errores de lint pertenecen al código existente en la base. Aún no se ejecutó lint directamente sobre el commit base.

### Seguimiento

La siguiente iteración agrega al job de build valores públicos ficticios apuntando a localhost, solo para permitir inicializar el cliente durante el build sin conectar a Supabase real. Resultado de esa iteración: pendiente de nueva ejecución de Actions. Si el build falla por otra causa, registrar el error exacto y no añadir secretos para silenciarlo.

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
