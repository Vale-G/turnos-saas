# Base de datos y RLS

## Lo confirmado

En una revisión de solo lectura del proyecto Supabase activo el 2026-10-26:

- RLS está habilitado en las tablas revisadas, pero eso no basta si existen policies permisivas y grants públicos.
- `public.turno`: política SELECT pública con `true`, INSERT público con `WITH CHECK (true)`; `anon` tiene SELECT e INSERT.
- `public.negocio`: SELECT público para `anon` y `authenticated` con `true`; existe la columna `mp_access_token`.
- `public.bloqueo`: lectura pública amplia y política de gestión que comprueba autenticación, no propiedad del negocio.
- Se revisaron también grants/policies de `bloquehorario` y permisos de funciones `SECURITY DEFINER`; sus combinaciones requieren análisis individual.
- Solo se identificaron dos migraciones registradas y no se localizó la fuente SQL de las policies actuales en el repositorio.

## No hacer

No ejecutar migraciones ni cambiar RLS sobre la base activa para experimentar. No revocar permisos de funciones privilegiadas sin revisar callers y comportamiento esperado.

## Siguiente estrategia

1. Localizar o reconstruir de forma verificada la fuente de esquema y migraciones.
2. Obtener un proyecto Supabase aislado.
3. Diseñar acceso público de mínimo privilegio y validación de propiedad por negocio.
4. Probar roles anon, propietario A, propietario B y administrador; incluir doble reserva concurrente.
5. Preparar migración revisable, rollback y evidencia antes de solicitar aprobación de despliegue.

Ver también [Seguridad](SECURITY.md) y el [plan P0 del PR #10](https://github.com/Vale-G/turnos-saas/pull/10).


## Sandbox Tunero 2 — verificación separada del proyecto activo (2026-10-29)

Este apartado corresponde únicamente al proyecto de prueba `Tunero 2` (`hwrlimcunbenxsvfbklr`), no al esquema de producción de Turnly.

- Estado Supabase: `ACTIVE_HEALTHY`; PostgreSQL 17.
- Tablas públicas: `negocios`, `perfiles`, `turnos`, `lista_negra`; la inspección informó cero filas y RLS habilitado.
- La herramienta de listado no devolvió migraciones registradas. Esto no prueba que el esquema carezca de cambios manuales.
- `perfiles` no tiene políticas; las tablas `negocios`, `turnos` y `lista_negra` tienen policies `FOR ALL` para `public`, con `WITH CHECK` nulo en las policies consultadas. Requiere análisis por operación.
- `public.rls_auto_enable()` es `SECURITY DEFINER` y `anon`/ `authenticated` pueden ejecutarla. No se ejecutó ni se inspeccionó su cuerpo.
- No coincide con el esquema esperado por Turnly (`negocio`, `turno`, `servicio`, `staff`, `bloqueo`, `bloquehorario`). No usar todavía como sandbox funcional, no cargar fixtures ni aplicar migraciones hasta validar la fuente de verdad.
