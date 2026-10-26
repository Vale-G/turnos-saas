# Turnly — contención de seguridad P0 (propuesta revisable)

Fecha: 2026-10-26  
Base: `codex/revisar-informes-de-turnos-cancelados`  
Commit base: `07bd2ee75b16e91a3d31f63b60cf7d8796d614cf`  
Estado: diagnóstico y plan; no se aplicaron cambios a código de ejecución ni a Supabase.

## Hallazgos de código verificados

1. `app/reservar/[slug]/page.tsx` ejecuta desde el navegador `supabase.from('negocio').select('*').eq('slug', slug).single()`. La proyección `*` puede devolver columnas privadas de la fila de negocio si las políticas/grants lo permiten. El hallazgo previo de auditoría indica que `mp_access_token` está entre esas columnas.
2. La misma página consulta directamente `turno` para obtener horas ocupadas y `bloqueo` para los bloqueos. Si el rol anónimo tiene lectura amplia en `turno`, la API puede exponer filas de reservas, no solo horarios ocupados.
3. La creación de la reserva se realiza desde el navegador con un `insert` directo a `turno`. Restringir la lectura sin diseñar un camino seguro de creación puede romper la reserva pública.
4. `app/api/sena/route.ts` acepta `monto_sena`, nombres y email del cuerpo de la petición, lee el token de Mercado Pago a través del cliente Supabase autenticado por cookies/anon key y no valida adecuadamente estado, propiedad y monto del turno. No modificar este flujo parcialmente: requiere validar configuración del servicio y el negocio en servidor y usar una credencial privada adecuada.
5. `app/api/notificar/route.ts` acepta los datos del correo desde el cliente y los interpola en HTML sin escape contextual; esto requiere validación/escape y limitar quién puede provocar envíos.

## Hallazgos verificados en Supabase (solo lectura)

Proyecto revisado: `akpwhsizquuhhlwincqs` (el usuario confirmó que es el proyecto que utiliza; no hay otra base de desarrollo).

1. RLS está habilitado en las tablas revisadas (`turno`, `negocio`, `bloqueo`, `bloquehorario`, `clientenota`, `lista_negra`), pero los privilegios de tabla incluyen SELECT e INSERT para `anon`. RLS habilitado no implica por sí solo que el acceso sea seguro; las políticas deben limitar las filas y columnas expuestas.
2. `turno` tiene una política SELECT pública con condición `true` y una política INSERT pública con `WITH CHECK (true)`. También existen políticas de inserción para invitados con controles adicionales, pero las políticas permisivas se combinan con OR: la política amplia puede anular en la práctica esos controles. Prioridad P0.
3. `negocio` tiene una política de SELECT para `anon` y `authenticated` con condición `true`, además de otras políticas de lectura. En combinación con el uso de `select('*')` desde la página pública, existe riesgo de exposición de campos privados como `mp_access_token`. Tratar ese token como potencialmente expuesto hasta validar el acceso y rotarlo de forma segura.
4. `bloqueo` tiene una política de gestión que solo comprueba `auth.role() = 'authenticated'`, sin comprobar propiedad del negocio; además, la lectura pública tiene condición `true`. Requiere política de propiedad y una proyección pública mínima para disponibilidad.
5. `bloquehorario` también permite acceso a nivel de tabla para `anon`; su política pública de lectura filtra por negocio activo, pero hay una política ALL adicional que comprueba propiedad. Revisar cómo se combinan y confirmar las columnas que deben ser públicas.
6. Las funciones `get_negocio_id_for_user()`, `handle_new_user()` y `registrar_movimiento_stock(...)` son `SECURITY DEFINER` y tienen EXECUTE concedido a `anon` y `authenticated` (además de PUBLIC). No revocar ni cambiar permisos a ciegas: revisar callers, comportamiento esperado y pruebas; `handle_new_user` parece ser una función de trigger y no debería necesitar invocación directa por clientes.
7. Solo se encontraron dos migraciones registradas en este proyecto. El código SQL fuente de las políticas actuales no se ha localizado en el repositorio, por lo que no hay que improvisar una migración sobre un esquema supuesto.
8. No se consultaron ni se copiaron valores de filas de clientes, ni se imprimieron secretos. Las consultas ejecutadas fueron de metadatos, políticas, privilegios y definiciones de funciones.

## Diseño de contención recomendado

### A. Lectura pública mínima del negocio
- Crear un endpoint server-side de lectura pública por slug, con una lista explícita de campos permitidos para la página de reserva.
- Nunca devolver `mp_access_token`, emails internos ni campos administrativos.
- No usar `select('*')` en la ruta pública.
- Confirmar las columnas y tipos reales en el esquema antes de escribir la proyección final.

### B. Disponibilidad sin exponer reservas
- Reemplazar la consulta anónima directa a `turno` por un endpoint/RPC de disponibilidad que devuelva únicamente intervalos ocupados necesarios, sin nombre, teléfono, correo, pagos ni otros identificadores de clientes.
- Validar slug/negocio, fecha, staff activo y rango permitido en servidor.
- Evitar carreras de reservas: la verificación de disponibilidad y la creación deben protegerse también en base de datos/operación transaccional; la comprobación solo en el navegador no es suficiente.

### C. Creación pública de reserva
- Crear un camino server-side o RPC con validación estricta de negocio, servicio activo perteneciente al negocio, staff activo, fecha/hora, duración, horario de apertura/cierre, bloqueos, solapamientos y campos aceptados.
- No aceptar desde el navegador estado de pago, `requiere_sena`, importe final ni campos administrativos.
- Preservar el flujo de invitado; no exigir registro como efecto colateral.
- Añadir pruebas de doble reserva concurrente y de IDs de servicio/staff pertenecientes a otro negocio.

### D. RLS y secretos
- Preparar una migración versionada y reversible solo después de localizar la fuente real del esquema/migraciones. No ejecutar en producción desde esta rama.
- Probar en un proyecto Supabase aislado: rol anon, usuario propietario, usuario de otro negocio y superadmin.
- Considerar `mp_access_token` potencialmente expuesto. Tras contener y probar el acceso, el propietario debe revocarlo/rotarlo en Mercado Pago y configurar el nuevo valor únicamente en un entorno seguro; no registrar el secreto.
- Como no existe una base de desarrollo confirmada, no ejecutar cambios de esquema ni políticas en el proyecto activo. Continuar con análisis estático y documentación hasta que haya una estrategia de pruebas segura.

## Criterios de aceptación antes de aprobar el cambio

- [ ] Anónimo no puede leer filas privadas de `turno` ni datos sensibles de `negocio`.
- [ ] Respuesta pública de negocio contiene solo los campos de perfil y reserva aprobados.
- [ ] Disponibilidad devuelve solo intervalos necesarios, sin datos de clientes.
- [ ] Una reserva pública válida sigue funcionando como invitado.
- [ ] Se rechazan servicio/staff ajenos al negocio, horarios fuera de rango, bloqueos y solapamientos.
- [ ] Dos reservas concurrentes no pueden ocupar el mismo intervalo incompatible.
- [ ] Un negocio autenticado solo puede leer y administrar sus propios registros.
- [ ] Ningún token o dato de pago se devuelve al navegador.
- [ ] Lint, build y pruebas de integración se ejecutan y sus resultados quedan adjuntos; no basta con que Vercel figure READY.

## Validación y límites de esta jornada

- Revisados en GitHub: `app/reservar/[slug]/page.tsx`, `app/api/sena/route.ts`, `app/api/notificar/route.ts`, `lib/supabase.ts` y `package.json`.
- `package.json` define `npm run lint` y `npm run build`; no define script de tests.
- Se revisaron en Supabase políticas RLS, privilegios de tabla, funciones privilegiadas y migraciones, usando consultas de solo lectura.
- GitHub informa estados de Vercel exitosos para el commit de documentación, pero esto no demuestra que se hayan ejecutado lint, build o pruebas de integración.
- No hay un runner de proyecto disponible a través de las herramientas conectadas, así que no se ejecutaron lint, build ni pruebas.
- No se modificaron policies, esquema, datos, secretos, variables ni producción.
- La implementación debe continuar solo con acceso a una instancia Supabase de prueba y con el esquema/migraciones reales disponibles. No aplicar una policy o RPC por suposición.
