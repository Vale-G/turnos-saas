# Pruebas y validaciones

## Comandos disponibles

En la raíz del repositorio:

- `npm ci`: instala las dependencias usando `package-lock.json`.
- `npm run lint`: ejecuta ESLint.
- `npm run build`: intenta compilar la aplicación Next.js para producción.

## Automatización de CI

El workflow [CI - Lint y build](../.github/workflows/ci.yml) se ejecuta en pushes a ramas `codex/**`, en pull requests dirigidos a `codex/revisar-informes-de-turnos-cancelados` y manualmente desde GitHub Actions.

La automatización no despliega ni modifica producción. Solo instala dependencias, ejecuta lint y build, y publica el resultado en GitHub Actions.

## Limitaciones conocidas

- En el `package.json` revisado no hay un script `test`; por ahora no existe una suite automatizada invocable con `npm test`.
- Lint y build no reemplazan las pruebas funcionales de reservas, permisos/RLS, pagos y webhooks.
- El build puede necesitar variables de entorno si el código las exige durante la compilación. No se deben guardar secretos en el workflow. Si falla por configuración ausente, revisar los logs y definir una estrategia segura antes de cambiar la CI.
- No afirmar que una validación pasó sin revisar el resultado real del workflow.

## Criterio de aceptación

Para considerar validado un cambio, registrar el resultado real de cada control (instalación, lint, build y pruebas específicas disponibles), junto con el commit revisado. Un control fallido o bloqueado debe quedar explícito y no se debe presentar como aprobado.

## Registro de QA — 2026-10-26

### PR #11 — CI: ejecutar lint y build

- PR: https://github.com/Vale-G/turnos-saas/pull/11
- Commit revisado: `b30adfeae0e2c064c4a682c0a99cc353e13cf756`
- Rama base: `codex/revisar-informes-de-turnos-cancelados` en `07bd2ee75b16e91a3d31f63b60cf7d8796d614cf`
- Ejecución de GitHub Actions: https://github.com/Vale-G/turnos-saas/actions/runs/40369892182
- `npm ci`: APROBADO; instaló 385 paquetes y auditó 386.
- `npm run lint`: FALLIDO; 37 errores y 15 warnings.
- `npm run build`: NO EJECUTADO; GitHub Actions lo omitió después del fallo de lint.
- Auditoría de dependencias durante `npm ci`: 20 vulnerabilidades reportadas (1 baja, 6 moderadas, 12 altas y 1 crítica). Este registro no identifica todavía los paquetes/rutas de dependencia afectados.
- Comparación con la base: el PR solo agrega `.github/workflows/ci.yml` y `docs/TESTING.md`; no modifica código de aplicación. Por lo tanto, los errores de ESLint observados pertenecen al código que ya estaba en la rama base y no fueron introducidos por este PR. No se ejecutó lint directamente en el commit base.
- No existe script de tests unitarios/integración/E2E en `package.json`; no se aprobaron flujos funcionales.

**Resultado del PR #11: NO APROBADO COMO VALIDACIÓN COMPLETA.** El workflow detecta correctamente que lint falla, pero todavía no hay resultado de build ni pruebas funcionales. Mantener el PR en borrador; no ocultar ni desactivar reglas de lint para obtener verde.

### Revisión de seguridad adicional — solo lectura

El 2026-10-26 se consultaron metadatos de políticas/grants y columnas del proyecto Supabase activo; no se leyeron filas de clientes, valores de tokens ni secretos, y no se ejecutaron escrituras ni migraciones.

- **P0:** `public.turno` tiene una política SELECT pública con condición `true` y una política INSERT pública con `WITH CHECK (true)`; el rol `anon` tiene privilegios de SELECT e INSERT. Esto habilita un camino de lectura de filas privadas y creación de reservas sin las restricciones esperadas.
- **P0:** `public.negocio` tiene SELECT para `anon` y `authenticated` con condición `true`; existe la columna `mp_access_token`, y `app/reservar/[slug]/page.tsx` consulta `negocio.select('*')`. La exposición efectiva del valor no se comprobó leyendo una respuesta, para no acceder a secretos; debe tratarse como potencialmente expuesto.
- **P1:** la política ALL de `public.bloqueo` solo comprueba que el rol esté autenticado, sin validar propiedad del negocio.
- **P1 / revisión requerida:** las funciones `get_negocio_id_for_user()`, `handle_new_user()` y `registrar_movimiento_stock(...)` son `SECURITY DEFINER` y permiten EXECUTE a `anon` y `authenticated`; revisar cada caller y revocar solo tras comprobar dependencias.
- La rama de auditoría contiene un plan documental en el [PR #10](https://github.com/Vale-G/turnos-saas/pull/10), pero no corrige código de ejecución ni políticas. Sin una instancia Supabase aislada y migraciones fuente verificadas, las pruebas de integración de RLS, doble reserva y pagos quedan **BLOQUEADAS**. No aplicar cambios a la base activa desde esta rama.

### Próximos pasos para desarrollo

1. Ejecutar build de forma independiente de lint (por ejemplo, en un job separado), sin convertir un fallo en éxito.
2. Analizar los avisos de dependencias, identificar paquetes directos/transitivos y preparar actualizaciones acotadas; no usar `npm audit fix --force`.
3. Tratar los P0 de reservas/negocio como bloqueo de seguridad para considerar Turnly validado. Diseñar la contención en una rama aislada y probar con roles/datos ficticios antes de cualquier cambio en producción.
4. Agregar pruebas de integración para lectura anónima, inserción pública restringida, propiedad por negocio, solapamientos/concurrencia, firma/importe/idempotencia de pagos y trial/suscripciones.
