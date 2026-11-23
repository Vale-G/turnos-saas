# Turnly · Suscripciones comerciales

**Candidata de código para revisión y ensayos aislados. Cobros recurrentes deshabilitados.**

## Derechos efectivos

| Acceso | Agenda y datos existentes | Reservas nuevas | Profesionales | Servicios | Informes RPC, operaciones de caja y edición de notas | Iniciar cobros de reservas |
|---|---|---|---|---|---|---|
| Prueba de 14 días | Sí | Sí | 5 | 10 | Sí | Sólo con integración de cobros del comercio configurada |
| Básico pagado y vigente | Sí | Sí | 2 | 5 | No | No |
| Pro pagado y vigente | Sí | Sí | 15 | 50 | Sí | Sólo con integración de cobros del comercio configurada |
| Vencido, impago o cancelado fuera del período | Sí | No | Altas cerradas | Altas cerradas | No | No |

Los límites cuentan registros activos e inactivos. RLS conserva el acceso a datos históricos según el rol. Los informes avanzados requieren el RPC autorizado, mientras que datos ya consultables desde agenda y el histórico de gastos y notas siguen preservados. Un Básico puede seguir operando los turnos y recursos existentes aunque excedan el cupo por un descenso. No puede crear más recursos hasta quedar por debajo del límite, o contratar Pro. La pausa de reservas bloquea el alta también desde el panel y deja operables cancelación, reprogramación entre horarios válidos y actualizaciones de estado de reservas existentes. Si un servicio conserva una seña obligatoria tras bajar a Básico, el comercio debe revisar esa condición antes de recibir nuevas reservas para ese servicio. El sistema evita crear una reserva que no pueda completar su seña.

El catálogo de PostgreSQL determina los límites que usan triggers y la interfaz. Los cambios privilegiados de plan, facturas, pagos y cancelación requieren RPC explícitos. Las solicitudes del propietario se atan a su identidad y al comercio resuelto en la base. Soporte puede consultar el historial y registrar notas auditadas. Una nota o solicitud de soporte no concede días ni activa un plan.

## Estados, plazos y conciliación

- La inserción atómica del negocio toma un único derecho de prueba por cuenta propietaria. PostgreSQL conserva el identificador de la cuenta en el registro de prueba aunque se quite un comercio. El control no prueba identidad jurídica ni detecta cuentas nuevas de la misma persona.
- Ventana pagada semicerrada. El instante de inicio cuenta y el de vencimiento queda excluido. Los estados `past_due` y `canceled` pueden conservar acceso durante un período que ya se pagó. Sin ventana vigente quedan disponibles agenda y datos. Un rechazo no acorta un período pagado ni borra un trial vigente.
- El siguiente período es mensual de calendario en UTC. El futuro adaptador registra límites de período verificados. Una aprobación anticipada se concilia al inicio del período, evitando reemplazar la ventana que ya está vigente.
- Sin prorrateo en esta versión. El cambio solicitado se aplica al primer período posterior conciliado con ese plan. Un pago pendiente o rechazado no otorga acceso nuevo. Cada factura y pago tienen identificación independiente y cada factura admite un único pago aprobado. Los reintentos son idempotentes. Importes, moneda, referencia y período se cotejan con la factura local.
- La solicitud de cancelación detiene nuevas facturas locales y queda pendiente hasta que el proveedor confirme la baja. La confirmación desactiva la renovación conservando el período pagado. No hay reembolso automático. Cobros ya emitidos, devoluciones y contracargos requieren procedimiento explícito de conciliación antes de activar la integración.
- Los precios definitivos, moneda, reglas de reembolso, textos y consentimiento comercial requieren aprobación. El catálogo de precios empieza vacío. Los importes anteriores del código no se usan como cotización.

## Mercado Pago

Se deshabilitó la antigua ruta de activación por Checkout de pago único. Las preferencias de pago de turnos siguen siendo un circuito distinto. La interfaz sólo registra solicitudes del comercio. No hay llamadas de alta, renovación ni baja recurrente conectadas a un proveedor real en esta rama.

Para implementar y validar el adaptador en Sandbox:

1. Provisionar una aplicación y credenciales de prueba separadas y fijar el catálogo de precios aprobado. Crear una autorización recurrente con `/preapproval`. Correlacionar su identificador persistido con el comercio y la solicitud local antes de aceptar sus facturas.
2. Aceptar avisos `subscription_preapproval` y `subscription_authorized_payment` con la firma `x-signature` y el identificador firmado de la URL. Usar el secreto de esa aplicación. Verificar primero la firma y leer los recursos autenticados del proveedor. Consultar la factura en `/authorized_payments/{id}` y el pago en `/v1/payments/{id}` cuando corresponda. Separar estado del mandato, estado de factura y estado efectivo del pago. Validar que pertenezcan a esa cuenta, suscripción y factura, y que correspondan a pruebas antes de pasarlos a las RPC locales.
3. Desde el servicio conciliador usar `turnly_commercial_stage_invoice` y `turnly_commercial_record_payment`. Persistir eventos para reintentos ordenados. Si el cobro llega antes del inicio de la ventana, reintentar al inicio. No usar las referencias enviadas por el navegador para elegir comercio, importe, factura o período.
4. Para una cancelación solicitar `PUT /preapproval/{id}` con estado cancelado y verificar el resultado autenticado antes de `turnly_commercial_confirm_cancellation`. Mantener visible el estado pendiente al fallar el proveedor. Ensayar fallos, replays y conciliación del siguiente período en Sandbox.
5. Confirmar el flujo de cambios de plan con Mercado Pago. Si requiere reemplazar una autorización, validar que el mandato anterior quede cancelado antes de asociar uno nuevo. Resolver operativamente disputas y contracargos. Mantener el endpoint HTTP deshabilitado hasta completar esos controles.

[Alta con pago autorizado](https://www.mercadopago.com.ar/developers/es/docs/subscriptions/integration-configuration/subscription-no-associated-plan/authorized-payments) · [Webhooks de suscripciones](https://www.mercadopago.com.ar/developers/es/docs/subscriptions/additional-content/your-integrations/notifications/webhooks) · [Gestión de suscripciones](https://www.mercadopago.com.ar/developers/es/docs/subscriptions/subscription-management)

## Migración y validación

Sobre la cadena reconciliada de #25, preparar `20261123000200_commercial_subscriptions.sql` después de `owner_operations`, `owner_insights`, `atomic_onboarding` y `restrict_public_truncate`. La migración es transaccional. Conserva suscripciones y pagos históricos. Sólo un pago legado activo con identificador, importe positivo y período completo y vigente puede conservar acceso pagado. Etiquetas históricas Pro sin ese respaldo quedan sin acceso efectivo. Antes de intervenir una base real, comparar el inventario de comercios y períodos, validar el punto de recuperación y conciliar diferencias de los comprobantes históricos. Ensayar la migración en una copia aislada. Coordinar la actualización de base y aplicación porque esta versión depende de las nuevas RPC.

Validar con npm test y el job nativo PostgreSQL 17 de CI. El escenario nativo compite por un mismo turno y por la última plaza de personal de un trial. Las pruebas de facturación usan facturas sintéticas con importes de prueba y ejecutan las RPC locales. No prueban entregas de Mercado Pago ni cambios de plan o cancelación en la cuenta del proveedor.
