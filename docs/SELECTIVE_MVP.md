# Recuperación selectiva de funcionalidades

Base: PR #17, ed62d82413628b48eb2c2f619baab33e083c43fd. Rama independiente; no se modifican main ni el PR #17.

## Funciones

- Historial en /mis-turnos: API autenticada y RPC con auth.uid(), proyección mínima y límite de 200 reservas recientes. No permite indicar cliente_id ni expone contactos, notas o tokens. Se accede desde la reserva pública estando autenticado. Cancelación/reprogramación siguen usando el enlace privado existente. No se vinculan reservas invitadas por coincidencia de email.
- Lista negra: ya existía en Clientes y /api/clientes/config con contexto de propietario. Se conserva el mismo almacenamiento y la validación server-side de /api/public/reservas, evitando crear otra tabla o importar rutas alternativas. Los tests heredados cubren teléfonos bloqueados, datos corruptos y errores; no se amplía a bloqueo por email en este alcance.
- Banner HTTPS y mensaje de hasta 500 caracteres: edición en Ajustes, restricciones SQL y RLS actuales. Renderizado como texto React, sin HTML arbitrario. URL de banner pública: no usar fotografías privadas. No se crea otro bucket.
- Recordatorios: /api/cron/reminders protegido con CRON_SECRET (mínimo 32 caracteres), TURNLY_REMINDERS_ENABLED=true y opt-in recordatorios_activos por negocio. Solo turnos confirmados para mañana; respeta zona_horaria. Reutiliza webhook_event y las funciones de claim/complete del flujo de notificaciones. Clave por turno, fecha y hora; idempotencyKey de Resend para reintentos. Reconsulta el turno antes de enviar. No crea otro webhook ni endpoint alternativo de reservas/pagos.

## Configuración / migraciones pendientes

Aplicar 20261114040000_selective_mvp.sql y 20261114040100_reminder_delivery.sql solo después de confirmar aislamiento QA. No se han aplicado en Supabase.

Configurar CRON_SECRET, RESEND_API_KEY y RESEND_FROM_EMAIL (remitente verificado); activar TURNLY_REMINDERS_ENABLED únicamente en el entorno previsto. Mantener Preview desactivado salvo prueba con destinatarios sintéticos.

El esquema base admite únicamente America/Argentina/Buenos_Aires. Vercel cron diario 12:00 UTC corresponde a las 09:00 del negocio y evita exigir cron horario. Otras zonas requieren ampliar tanto restricciones como programación; no se anuncian soportadas.

## Límites y QA

Historial limitado a 200 filas; no hay paginación ni adopción automática de reservas invitadas. La confirmación privada ya permite gestionar una reserva sin cuenta.
Recordatorios dependen de ejecución durante las 09 locales; una interrupción de la plataforma puede omitir el envío ese día. El proveedor limita su ventana de idempotencia; no se promete exactamente una entrega bajo fallos arbitrarios. Una cancelación posterior a la última consulta puede coincidir con el envío.
No se realizaron cobros, envíos reales, migraciones ni escrituras Supabase. Pendientes: QA con base aislada, cron real, fallos/reintentos del proveedor y responsive del historial/banner.

CI de esta rama ejecuta lint, typecheck/build, pruebas y concurrencia con PostgreSQL 17. Los resultados deben consultarse en el commit publicado; no sustituir concurrencia nativa por PGlite.
