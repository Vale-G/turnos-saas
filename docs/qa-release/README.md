# Turnly · Decisión de lanzamiento del 19 de noviembre de 2026

**NO-GO para producción.** El circuito básico funciona en una instalación local descartable. El Preview de esta rama todavía puede heredar la configuración general del proyecto. La rama tiene el despliegue Git de Vercel desactivado. El primer piloto propuesto comprende reservas como invitado y pago en el local.

## Código y entornos

| Referencia | Base | Punta | Evidencia |
|---|---|---|---|
| main | — | a226534 | Base de #17 al comenzar |
| #17 | main | ed62d82 | Abierto, borrador. GitHub no devolvió una ejecución asociada a esta punta |
| #18 | #17 | f1e10e4 | Abierto, borrador. Workflow 43553128614 aprobado |
| #20 | #18 | 0e125a2 | Abierto, borrador. Workflow 44386569927 aprobado |
| Estabilización | #20 | Consultar la punta del PR | Incorpora la validación de lista negra de la rama hermana, parche de Next.js, cambios de reservas, agenda y alta atómica |
| Producción Vercel | turnos-saas-eight.vercel.app | bc234fb | Alias asociado a dpl_S8GMcwTMkHAnURLjVkwrFjJX3sVj, READY |
| Supabase QA | hwrlimcunbenxsvfbklr | PG 17 | 11 entradas de migración. La última por nombre es reminder_delivery |
| Supabase producción | akpwhsizquuhhlwincqs | PG 17 | El historial consultado tiene dos entradas de marzo. El esquema efectivo requiere comparación aparte |

QA registra versiones con timestamps diferentes a los SQL de la candidata. En particular, faltan en su historial owner_operations, owner_insights y atomic_onboarding. Los números de migración por sí solos no demuestran equivalencia del esquema. Vercel muestra URL, clave pública y credencial de servidor generales compartidas entre Preview y Production. Hay configuraciones por rama para #18 y #20. No se encontró una específica para esta rama. La inspección fue por nombres y destinos, sin descifrar valores.

## Matriz de decisión

| Prioridad | Evidencia | Estado y condición de cierre |
|---|---|---|
| P0 | El alta anterior creaba negocio y rol en peticiones separadas y sobreescribía roles existentes | Corregido localmente. Una transacción conserva el rol previo, revierte el alta si falla la asignación y serializa dos altas del mismo usuario. Dos POST concurrentes dieron 201 y 409 |
| P0 | La candidata #20 omitía una corrección que distingue configuración ausente de lista negra inválida | Integrada y cubierta por seis pruebas de la rama original |
| P0 | Un cierre legado a las 23:59:59 dejaba vacía la disponibilidad de toda la jornada | Corregido tomando el último minuto completo. La validación de intervalos de bloqueo sigue siendo conservadora |
| P0 de despliegue | Preview sin aislamiento acreditado. Dos historiales remotos difieren. Advisors señala ejecución de funciones privilegiadas por roles públicos en producción y avisos de permisos en QA | Pendiente de comprobar política, función, grants, ownership, extensiones y restauración antes de exponer datos de comercios. El aviso por sí solo no demuestra una fuga |
| P1 | Reserva pública con controles sin teclado, confirmación ambigua tras errores de transporte y pérdida de datos al volver de paso | Se probaron controles nativos, conflicto con retorno al horario, resumen, etiquetas, datos conservados en memoria y confirmación con identificador y enlace de gestión |
| P1 | Panel centrado en navegación, error de lectura de agenda indistinguible de un día vacío | Ahora muestra próximos turnos, hora y estado con acceso al detalle. Agenda ofrece error y reintento. Falta validar con lector de pantalla y una jornada real |
| P1 | Aviso de Next.js 16.4.3 | Next y eslint-config-next en 16.4.6, npm audit sin avisos en el lockfile evaluado |
| P1 comercial | Baja, soporte, exportación y borrado requieren recorrido documentado; términos mencionan 99 % de disponibilidad | Revisar capacidad operativa, contacto y promesas con el responsable antes de invitar comercios |
| P2 | Pronóstico con horizonte y error retrospectivo pendientes de validación | Posponer Insights avanzado, automatización comercial y analítica predictiva |

## Cobertura por módulo

| Módulo | Estado observado |
|---|---|
| Alta, autenticación, roles | Alta atómica probada con identidad local sintética. Google, recuperación de cuenta, correo de alta y redirects del dominio real quedan pendientes |
| Comercio, servicio, profesional y horarios | Formularios y endpoints presentes. El circuito integrado utiliza un servicio y un profesional preparados en PostgreSQL. Falta recorrer la creación de ambos desde una cuenta nueva remota |
| Reserva pública | Verificada en navegador invitado, API Next, PostgREST y PostgreSQL locales. Se registró el turno y apareció en la agenda autenticada |
| Agenda, cancelación y reprogramación | Consulta por fecha y cancelación del propietario verificadas localmente. La cancelación libera el horario. Reprogramación y token tienen cobertura SQL |
| Hoy y personalización | Próximos cuatro turnos del día, estado, enlace a detalle y modo privado del panel. La selección privada se guarda por usuario en ese navegador. Marca pública, banner, enlace y servicios conservan el modelo existente |
| Caja y señas | Hay reglas y pruebas locales de cobro, conciliación y webhook. Sandbox de Mercado Pago y reembolsos de punta a punta pendientes. Piloto propuesto sin seña integrada |
| Clientes e historial | Cobertura local de aislamiento y acceso al historial. Exportación integral y borrado operativo sin certificar |
| Notificaciones | Pruebas locales de reclamo, reintentos e idempotencia. Sin envíos externos. Verificar remitente, destinatario, consentimiento y bajas antes de habilitar |
| Planes, suscripciones y soporte | Reglas de acceso y límites con pruebas. Alta comercial, cobro periódico, baja y recuperación de información requieren ensayo operativo |
| Informes | Implementados en #20. Limitaciones de duración, ocupación histórica, cohortes y pronóstico documentadas en ../qa-owner-operations.md |

## Diseño y pruebas

Figma contiene cuatro frames en Page 1. Hoy escritorio claro y oscuro (1:12 y 1:108) y Reserva móvil clara y oscura (1:85 y 1:181). Se revisó la composición editable. La reserva adopta superficies semánticas, fondo crema o marino, progreso, botones accesibles y resumen previo. Hoy conserva navegación y accesos existentes, incorpora la agenda real y reutiliza OwnerTasks y el sistema de apariencia. Quedan diferencias en barra lateral, indicadores diarios, paleta y cobertura de temas en Agenda, además de la validación de contraste de cada personalización. No hay certificación WCAG.

| Evidencia de interfaz | Archivos |
|---|---|
| Reserva a 320, 390, 768 y 1280 px | [320 claro](reserva-claro-320.webp), [390 oscuro](reserva-oscuro-390.webp), [768 oscuro](reserva-oscuro-768.webp), [1280 claro](reserva-claro-1280.webp) |
| Hoy escritorio con propietario sintético y consulta real a PostgreSQL local | [Claro](hoy-claro.webp), [Oscuro](hoy-oscuro.webp) |

La suite local dio **88/88**. Pasaron ESLint, TypeScript y build de Next. PostgreSQL 17.12 nativo recibió dos solicitudes incompatibles mediante la misma RPC que usa el endpoint y persistió una. Chromium recorrió la reserva a cuatro anchos, con catálogo y conflicto sintéticos, y comprobó que no hubiera desborde horizontal en el primer y último paso. Un segundo recorrido usó Next y PostgREST reales en loopback, reservas persistidas, cancelación y consulta de la agenda como propietario. Se usaron identidades sintéticas. Los servicios de identidad y correo externos quedaron fuera. No hubo migraciones ni escrituras remotas, cobros ni despliegues.

Para reproducir los controles del repositorio, ejecutar npm ci, npm test, npm run lint y npm run typecheck. Compilar con NEXT_PUBLIC_SUPABASE_URL apuntando a loopback y una clave pública ficticia. Ejecutar tests/native-concurrency.sh con un clúster PG 17 nuevo y TURNLY_TEST_DATABASE_URL de loopback, base turnly_test y usuario de prueba. El test crea roles a nivel de clúster. La fixture omite el esquema plural legado y su migración específica. Los recorridos de navegador fueron ejecutados durante esta auditoría; no forman parte del CI existente.

## Privacidad y condiciones comerciales en Argentina

Existen /privacidad y /terminos. Antes del piloto, identificar quién responde por Turnly y por cada comercio, canal para solicitudes, categorías y finalidades, destinatarios y transferencias internacionales, plazos de conservación y procedimiento para acceso, rectificación, exportación y supresión. Inventariar cookies de sesión, almacenamiento de preferencias y cualquier medición. Revisar fundamento, consentimiento y mecanismo de baja cuando corresponda. Ensayar solicitudes y registrar su resolución sin copiar información privada al soporte técnico.

Revisión profesional pendiente sobre el alcance de la Ley 25.326 y la Ley 24.240 según el rol de Turnly, del comercio y del consumidor final. Incluir condiciones de seña, devolución, suspensión, cancelación de suscripción y publicidad. Validar afirmaciones de disponibilidad y cualquier testimonio antes de publicar.

[Protección de datos personales, texto actualizado](https://www.argentina.gob.ar/normativa/nacional/ley-25326-64790/actualizacion) · [Defensa del consumidor, texto actualizado](https://www.argentina.gob.ar/normativa/nacional/638/actualizacion)

## Secuencia de publicación y recuperación

1. Aprobar exclusivamente el acondicionamiento de QA. Revisar el esquema efectivo y migraciones bajo control de versiones, incluyendo diferencias de timestamp. Preparar respaldo, medir restauración en una copia descartable y registrar la versión de partida.
2. Configurar URL, clave pública y rol de servidor exclusivos de QA para la rama. Validar la vinculación de las tres al proyecto correcto y comprobar que las rutas de autenticación regresen al Preview. Dejar fuera claves productivas de Mercado Pago, Resend y cron.
3. Con autorización de migración QA, aplicar solo los cambios que falten. Sobre la base equivalente a #18, aplicar primero owner_operations, luego owner_insights y luego atomic_onboarding. Probar roles con dos negocios, invitado y staff. Repetir registro, primer servicio, invitación, reserva, modificación y cancelación en Preview aislado.
4. Autorizar por separado la integración de PR, migración productiva, despliegue y apertura del piloto. Registrar despliegue anterior, snapshot recuperable y ventana. Revisar los avisos de seguridad y el canal de soporte. Si falla un control, mantener cerrado el piloto.
5. Tras activar, vigilar errores de alta y creación, conflictos por horario, latencia de consultas de agenda y discrepancias entre reservas creadas y visibles. Verificar el primer negocio autorizado y su enlace de gestión. Evitar guardar tokens, nombres y teléfonos en logs.
6. Ante duplicados, acceso cruzado o pérdidas, detener nuevas reservas y preservar las existentes. Reasignar el alias al despliegue anterior solo tras comprobar compatibilidad de esquema. Si hubo reservas nuevas, conciliar respaldo y registros actuales antes de cualquier restauración. Toda operación productiva requiere aprobación del propietario.
