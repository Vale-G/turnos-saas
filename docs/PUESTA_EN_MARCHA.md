# Turnly: base correcta y validación

Base de trabajo: `codex/revisar-informes-de-turnos-cancelados`, commit `07bd2ee`. La reparación de main en PR13 no representa esta versión y no debe fusionarse como lanzamiento.

Esta versión usa Next 16.1.6 y React 19.2.3. Con la URL y clave pública del entorno de prueba, el build completo pasó; eso no demuestra que los flujos funcionen contra la base. `npm run lint` detectó 37 errores y 15 advertencias antes del cambio de proxy.

Se reemplazó middleware por proxy, se valida usuario con getUser, se amplió la protección a todas las rutas privadas y se preservan las cookies de refresh en respuestas y redirects. Esto no reemplaza RLS ni la autorización de las API.

Bloqueo de datos: Tunero 2 (`hwrlimcunbenxsvfbklr`) tiene negocios/perfiles/turnos/lista_negra. La app espera negocio/adminrol/staff/servicio/turno/config/gasto/bloqueo y otros objetos. No se puede considerar conectado simplemente por configurar las variables. El proyecto principal `akpwhsizquuhhlwincqs` sí muestra esas tablas; no se modificó su estructura ni datos.

Antes de publicar: preparar esquema y políticas compatibles en desarrollo, validar aislamiento de usuarios y negocio, alta de negocio, reserva, conflictos de horario, cancelación y pagos. La cuenta Vercel UNNOBA todavía no tiene conexión de inicio de sesión con GitHub; el deploy puede hacerse con fuentes, pero no reemplaza las pruebas de base de datos.

La inspección de políticas del proyecto principal encontró SELECT público con condición true en turno y negocio. No se consultaron registros ni credenciales. Estas políticas requieren revisión antes de usar datos reales, especialmente porque negocio contiene configuración de pagos. No se modificaron políticas productivas sin validar el reemplazo en desarrollo.
