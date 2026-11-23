# Turnly · Candidata final de lanzamiento

Base fijada a #26 en `1dc196b`, sobre #25 en `e5dd74c`. **NO-GO comercial.** La revisión del código y las pruebas aisladas pueden avanzar.

## Derechos efectivos verificados

| Acceso | Profesionales | Servicios | Reservas nuevas | Informes avanzados, operaciones de caja y edición de notas |
|---|---:|---:|---|---|
| Prueba de 14 días sin tarjeta | 5 | 10 | Sí | Sí |
| Básico vigente | 2 | 5 | Sí | No |
| Pro vigente | 15 | 50 | Sí | Sí |
| Fuera de período vigente | Altas cerradas | Altas cerradas | Cerradas | No |

Un descenso conserva los registros. El cupo cuenta activos e inactivos. Agenda y datos existentes siguen disponibles según el rol. Un período pagado sigue vigente tras confirmar la baja de renovación. Las devoluciones, devoluciones parciales y contracargos del período que da acceso retiran ese acceso y quedan auditados. Una reversión histórica conserva el período posterior que tenga un pago independiente válido. No hay prorrateo. Para un cambio se cancela la renovación del mandato anterior y se autoriza el nuevo plan al cierre del período vigente.

## Facturación y pruebas

- El alta obtiene precio y moneda del catálogo privado. Una reserva durable impide enviar dos POST de creación para el mismo mandato. Si se pierde la respuesta, el webhook de preapproval reconcilia por referencia interna. Si el proveedor nunca creó la autorización y tampoco hay aviso, soporte debe verificar la ausencia de mandato antes de desbloquear ese intento. Nunca reenviar a ciegas.
- Los avisos SaaS requieren HMAC, timestamp y un identificador único firmado en la URL. La cola conserva revisiones, reintentos y casos a revisión. El trabajador reconsulta `preapproval`, `authorized_payments` y `v1/payments` desde la API. Verifica aplicación, cuenta cobradora, modalidad, mandato, factura, fecha, importe y moneda. Los períodos anticipados esperan su inicio. Los eventos fuera de secuencia esperan o quedan en revisión. Una aprobación idempotente sólo otorga un período. La cancelación se confirma consultando al proveedor después del PUT.
- El débito diario canónico usa UTC. El primer período debe corresponder al ancla registrada y el siguiente debe empezar exactamente en el fin del anterior. Es necesario contrastar esta correspondencia en Sandbox, especialmente débitos diferidos, reintentos que cambien fecha y cierres del 29 al 31. Un calendario inesperado queda en revisión con estado conservador.
- El circuito de cobro de turnos del comercio permanece separado. Los precios SaaS empiezan vacíos. El adaptador sólo acepta modo Sandbox con configuración explícita. Cualquier activación real requerirá además revisar y habilitar un modo de producción separado.
- El fixture integra el adaptador HTTP simulado con las RPC de PostgreSQL. Cubre intento duplicado, anticipo, factura ajena, fecha y monto incorrectos, moneda incorrecta, pago pendiente/rechazado/aprobado, renovación, solicitud de cambio, cancelación, reversión actual e histórica. La firma tiene pruebas independientes. CI aplica la cadena en PostgreSQL 17 descartable y compite por turnos, cupo y facturas.
- La recuperación de contraseña usa PKCE y destinos permitidos. El smoke comprueba formularios con etiquetas y disponibilidad HTTP. El recorrido de correo real, una sesión remota auténtica y el checkout alojado requieren entornos externos aislados.
- Las solicitudes de privacidad se registran por usuario y tipo, con revisión autorizada y auditada. La interfaz no exporta ni elimina registros automáticamente. Soporte debe cotejar identidad y alcance, separar datos de terceros, hacer una entrega segura y cerrar el caso con evidencia autorizada. Textos, plazos, canal, retención y condiciones comerciales requieren aprobación jurídica y operativa.

[Crear suscripción](https://www.mercadopago.com.ar/developers/es/reference/online-payments/subscriptions/create-preapproval/post) · [Facturas autorizadas](https://www.mercadopago.com.ar/developers/es/reference/online-payments/subscriptions/get-authorized-payment/get) · [Webhooks](https://www.mercadopago.com.ar/developers/es/docs/subscriptions/additional-content/your-integrations/notifications/webhooks) · [Cancelar y administrar](https://www.mercadopago.com.ar/developers/es/docs/subscriptions/subscription-management) · [Recuperación Supabase Auth](https://supabase.com/docs/reference/javascript/auth-resetpasswordforemail)

## Preparar entornos y aplicar después de la autorización

1. Cerrar la recuperación separada de QA y cotejar una copia restaurada. Confirmar el proyecto de producción activo, destino real del dominio y responsables de intervención. El dominio verificado es `turnos-saas-eight.vercel.app`. Los metadatos disponibles muestran el QA `hwrlimcunbenxsvfbklr` activo y el proyecto histórico `akpwhsizquuhhlwincqs` inactivo.
2. Mantener el despliegue Git desactivado. Autorizar primero Preview en un destino aislado. Asegurar que Auth, callbacks y las tres variables Supabase pertenecen a QA. El build de Preview exige `TURNLY_PREVIEW_QA_REF=hwrlimcunbenxsvfbklr`, URL exacta de QA y coincidencia de referencias para claves JWT. Las claves opacas requieren verificación manual de origen. Mantener secretos de correo, pagos y cron productivos fuera de Preview.
3. Ensayar inventario y migraciones en copia descartable. Comparar por contenido y catálogo las once migraciones base, luego `owner_operations` → `owner_insights` → `atomic_onboarding` → `restrict_public_truncate` → `commercial_subscriptions` → `mercadopago_saas_adapter` → `privacy_requests`. Revisar RLS, propietarios, accesos efectivos, grants heredados y datos históricos antes de aprobar un paso remoto. El CI usa una fixture y no recupera QA.
4. Ejecutar las pruebas comerciales sólo con aplicación, comprador y vendedor de prueba aislados. Configurar `TURNLY_SAAS_BILLING=sandbox`, `TURNLY_SAAS_SANDBOX_ORIGIN` con origen HTTPS autorizado, `TURNLY_SAAS_MP_TEST_TOKEN` con prefijo TEST, `TURNLY_SAAS_MP_APPLICATION_ID`, `TURNLY_SAAS_MP_COLLECTOR_ID`, `TURNLY_SAAS_MP_WEBHOOK_SECRET` y `TURNLY_SAAS_WORKER_SECRET`. Usar precios inequívocamente sintéticos y verificar que los pagos indiquen modo de prueba. No reutilizar los secretos de cobro de turnos. Comprar, renovar, rechazar, devolver y cancelar con cuentas sintéticas.
5. Configurar avisos a `POST /api/webhooks/suscripcion` y un ejecutor para `POST /api/cron/billing` con bearer dedicado y concurrencia acotada. El ejecutor no está programado automáticamente. Monitorear profundidad y edad de `saas_delivery`, reintentos, resultado `review`, reservas rechazadas y errores de Auth. Revisar problemas con el ID de referencia, nunca con tokens o cuerpos crudos. Verificar el reenvío tras 401/503 y la política de retención antes de activar.
6. Revisar aprobación de precios, renovación, devoluciones, privacidad y soporte. Acreditar con identidades sintéticas registro, recuperación, catálogo, agenda, reserva y el flujo completo de proveedor en Preview aislado. Aprobar por separado la integración, la intervención de datos, el despliegue y la apertura comercial.
7. Para contener un incidente, desactivar ingreso y trabajador de facturación con el control del entorno y preservar la cola y el ledger. Resolver con el proveedor el estado de mandatos que puedan seguir cobrando. Volver al artefacto previo sólo si es compatible con el esquema. Conciliar operaciones posteriores al snapshot y evitar sobrescribir turnos nuevos. Cualquier rollback remoto requiere autorización.

## Conservación legada

El [inventario SQL](sql/inventario-legado.sql) sólo consulta catálogo y totales. Ejecutarlo primero en copia, usando un usuario de lectura y verificando el destino. Si hay datos legados:

- Conciliar turno/citas/turnos por comercio, profesional, instante con zona y estado. Preservar identificadores históricos y detectar conflictos antes de generar correspondencias. Ensayar lotes idempotentes con claves de origen en la copia y comparar conteos y contenido.
- Convertir rangos y recurrencias de horarios_bloqueados sólo tras comprobar significado de zona horaria, extremos y asignación a comercio/profesional. Comparar disponibilidad de una agenda control antes y después.
- Inventariar lista_negra por teléfono, email e identidad autenticada. Normalizar teléfonos sin descartar detecciones por email o identidad. Si esas reglas existen, resolver su semántica y cotejar bloqueo por los tres tipos antes de abrir nuevas reservas. Mantener intactas las filas fuente.
- Conciliar pagos activos legados por fecha, importe y prueba de proveedor. Etiquetas Pro sin período acreditable no otorgan acceso. Confirmar si existían renovaciones externas antes de crear un mandato nuevo.

## Clasificación

| Prioridad | Pendiente |
|---|---|
| P0 externo | Cierre de recuperación y cotejo de datos legados de QA. Confirmación del destino productivo y aislamiento real de Preview. Credenciales Sandbox y evidencia del proveedor. Precios y condiciones aprobados. Autorización de migraciones y salida comercial. |
| P0 externo | Revisar y habilitar de forma expresa el modo recurrente de producción sólo después de Sandbox. Confirmar un canal operativo para privacidad, disputas y cancelaciones. |
| P1 | Ampliar la automatización de accesibilidad y de interfaz a gestión de agenda e informes tras validar los flujos esenciales. |
| Poslanzamiento | Automatizar exportaciones aprobadas y ampliar herramientas de conciliación operativa. |
