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
