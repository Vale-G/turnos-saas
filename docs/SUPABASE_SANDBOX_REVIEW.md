# Revisión de Supabase de prueba — Tunero 2

Fecha: 2026-10-28  
Proyecto: `Tunero 2` (`hwrlimcunbenxsvfbklr`)  
Alcance: inspección de solo lectura. No se ejecutaron migraciones ni escrituras.

## Estado y datos

- Estado del proyecto: `ACTIVE_HEALTHY`.
- Región: `us-west-2`; PostgreSQL 17.
- Las tablas públicas detectadas son `negocios`, `perfiles`, `turnos` y `lista_negra`; todas reportan cero filas y RLS habilitado.
- La herramienta de listado de migraciones no devolvió migraciones registradas. Esto no prueba por sí solo que el esquema esté vacío ni que no haya habido cambios manuales.

## Hallazgos de seguridad confirmados en el sandbox

- `public.perfiles` tiene RLS habilitado, pero no tiene políticas.
- Las políticas actuales de `lista_negra`, `negocios` y `turnos` son `PERMISSIVE`, se aplican al rol `public` y usan `FOR ALL`. Las comprobaciones de propiedad consultan `auth.uid()` y `negocios.owner_id`, pero `WITH CHECK` es nulo en las tres políticas listadas; debe verificarse el comportamiento de INSERT/UPDATE y restringirse explícitamente por operación antes de usar el entorno para pruebas.
- Las cuatro tablas son visibles en el esquema GraphQL para `anon` y `authenticated`, según el advisor. La visibilidad del esquema no demuestra por sí sola que todas las filas sean legibles; se deben probar los grants y las policies con roles controlados.
- `public.rls_auto_enable()` es `SECURITY DEFINER`; la consulta de privilegios confirma que `anon` y `authenticated` pueden ejecutarla. No se ejecutó ni se inspeccionó su cuerpo. Debe revisarse y revocarse o restringirse su ejecución antes de usar el sandbox.
- El advisor informa que la protección de contraseñas filtradas está deshabilitada.

## Incompatibilidad con el esquema esperado de Turnly

La documentación existente de Turnly describe tablas singulares como `public.turno`, `public.negocio` y `public.bloqueo`, además de `bloquehorario`. El sandbox inspeccionado expone `turnos`, `negocios`, `perfiles` y `lista_negra`; no aparecen `bloqueo`, `bloquehorario`, `servicio` ni `staff` en el listado revisado. Tampoco se encontraron migraciones registradas mediante la herramienta. Por lo tanto, **no se debe aplicar directamente el esquema actual de Turnly ni usar este proyecto para validar RLS de la app todavía**.

## Acciones seguras siguientes

1. Localizar una fuente de verdad verificable para el esquema de Turnly (migraciones versionadas o una extracción revisada de la base original), sin leer ni copiar secretos.
2. Comparar columnas, claves foráneas, políticas y funciones antes de decidir si Tunero 2 se puede convertir en sandbox compatible.
3. Si se decide adaptar el sandbox, preparar migraciones versionadas y un plan explícito de cambios; primero resolver o retirar la función `rls_auto_enable()` de forma revisada, y definir políticas por operación con ownership multiempresa.
4. Crear fixtures totalmente ficticios y pruebas negativas: anon no obtiene datos privados, propietario A no accede al negocio B, y las operaciones CRUD no permiten reasignar ownership.
5. Ejecutar los tests de integración solo después de revisar y aprobar el plan de esquema. Mantener producción, sus secretos y sus políticas intactos.

## Límites de esta revisión

Esta revisión no constituye aprobación de seguridad ni prueba funcional de Turnly. No se consultaron filas de usuarios, reservas, tokens ni otros datos de negocio; no se ejecutó la función privilegiada; no se modificó el esquema ni los permisos.