# Turnly — contexto y contrato P0 (13/11/2026)

## Estado y fuentes
- Rama estable de referencia: `codex/revisar-informes-de-turnos-cancelados` @ `07bd2ee75b16e91a3d31f63b60cf7d8796d614cf`. Esta rama NO se modifica.
- Rama documental: `codex/p0-reservation-security-contract-20261113`, creada desde ese commit. No hay cambios de runtime, SQL ni despliegues.
- Producción: último commit reportado previamente en Vercel `bc234fb0b8c981935602168ca0b6982d24d0956f`; **no reconfirmado hoy** (la cuenta Vercel consultada no devolvió el proyecto).
- Trabajo posterior, NO fusionado: PR [#11](https://github.com/Vale-G/turnos-saas/pull/11) y rama `codex/fix-authenticated-booking-phone-20261111` @ `e185877906f61f3a5865869874706c04197b7059`. No asumir que están en producción.
- Fuente del plan: [Notion](https://app.notion.com/p/405dcb0069a18174beeaf1d6d0285a4c).

## P0 confirmado por lectura de código y auditorías anteriores
- `app/reservar/[slug]/page.tsx` consulta `negocio.select('*')`, consulta `turno` y crea turnos directamente desde el navegador. El flujo de lista negra y la comprobación de disponibilidad en cliente pueden omitirse mediante un cliente modificado si los permisos efectivos admiten el INSERT.
- Auditoría de metadatos previa: `negocio` y `turno` tienen SELECT público demasiado amplio; `turno` permite INSERT anónimo con `WITH CHECK (true)`. **No se ejecutó un ataque ni prueba de explotación hoy**.
- No existe evidencia de un sandbox Supabase con esquema compatible, ni pruebas de RLS anónimo/negocio A/negocio B o concurrencia. P0 sigue abierto.

## Contrato de implementación antes de tocar producción
1. Inventariar y versionar el esquema SQL real (tablas, claves, índices, policies, grants, triggers, funciones, dependencias). Excluir filas, secretos y datos personales. Revisar privilegios de funciones SECURITY DEFINER.
2. Crear sandbox separado compatible y datos ficticios: dos negocios, dos propietarios, cliente e invitado. Nunca usar credenciales o pagos reales.
3. Exponer un perfil público mediante allowlist explícita (identidad pública, servicios activos, staff activo, horarios y zona autorizada). No devolver `mp_access_token`, configuración privada, notas, lista negra ni reservas.
4. Sustituir INSERT del navegador por endpoint/RPC controlado. Validar identidad/rol cuando corresponda, negocio activo, servicio/staff pertenecientes al negocio, fecha/hora y zona horaria, duración, horario comercial, bloqueos, lista negra y reglas de pago; derivar importes en servidor. No confiar en precio, estado, negocio o usuario recibidos del navegador.
5. Garantizar exclusión de solapamientos con mecanismo **atómico en base de datos** (transacción con bloqueo o restricción de exclusión apropiada al esquema); devolver conflicto explícito. No confiar solo en una lectura previa.
6. Reemplazar SELECT/INSERT públicos amplios por permisos mínimos después de que los nuevos endpoints estén probados. Comprobar RLS para anónimo, propietario A, propietario B y cliente; comprobar que el navegador no puede leer turnos ajenos ni columnas privadas.
7. Preparar migraciones ordenadas, revisión humana, backup, rollback y rotación del token MP potencialmente expuesto. Requiere aprobación expresa antes de aplicar sobre producción.

## Matriz de aceptación (PENDIENTE, no ejecutada)
- Anónimo: lee solo perfil público; SELECT directo de `turno` y token MP denegados.
- Invitado: crea reserva válida vía servidor; datos inválidos, bloqueos, lista negra y servicio ajeno denegados.
- Concurrencia: dos solicitudes simultáneas al mismo recurso/intervalo -> como máximo una reserva confirmada.
- Negocio A: ve solo sus turnos; negocio B no puede leer/modificar los de A.
- Cliente: no accede al historial de otro alterando IDs.
- Pagos: importe y destino calculados en servidor; webhook firmado, verificado e idempotente (etapa posterior a P0).

## Evidencia y próximos pasos
- Lectura estática realizada el 13/11/2026 sobre `app/reservar/[slug]/page.tsx` de `codex/fix-authenticated-booking-phone-20261111`, y `docs/SECURITY.md` de esa rama.
- `README.md` leído: aún es plantilla Next.js. `docs/AI_CONTEXT.md` de la rama posterior también leído. Este documento no pretende reemplazar su historial ni incorporar sus cambios a la base estable.
- No se ejecutaron `npm ci`, `npm test`, lint ni build en esta rama documental; tampoco se verificó un workflow nuevo. Un documento no constituye QA funcional.
- Siguiente trabajo seguro: localizar SQL de fuente de verdad, preparar migración **sin aplicarla**, tests aislados y diseño de endpoint. Mantener bloqueadas nuevas funciones comerciales.
