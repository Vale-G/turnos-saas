# Evolución de Turnly

La base revisada es el PR [#27](https://github.com/Vale-G/turnos-saas/pull/27) en `8bb6562`, sobre [#26](https://github.com/Vale-G/turnos-saas/pull/26) y [#25](https://github.com/Vale-G/turnos-saas/pull/25). El [diseño original de Figma](https://www.figma.com/design/C3GaiK1O2WtnpnADudBVnp) aporta las referencias de Hoy y Reserva en claro y oscuro. El [sprint de Turnly](https://app.notion.com/405dcb0069a18174beeaF1d6d0285a4c) y los [criterios de QA](qa-release/README.md) guían los recorridos prioritarios.

## Matriz de funcionalidad

A indica comportamiento existente conservado, B cobertura parcial, C trabajo completado en esta rama y D evolución con dependencias de producto o arquitectura. Las validaciones de cada versión están en GitHub Actions.

| Área | Estado | Cobertura |
| --- | --- | --- |
| Tema de Turnly | C | Claro cálido y verde bosque, oscuro azul marino con acentos verde y rosa, y automático. Preferencia por navegador, navegación lateral en escritorio y táctil en móvil. La marca y el modo de la ficha pública siguen en la configuración de cada comercio. |
| Landing | C | Ejemplo de agenda, planes, prueba de 14 días, alta, ingreso, preguntas frecuentes y enlaces legales. Precios pendientes de aprobación. |
| Hoy | C | Próximos turnos del día, recuentos y cancelaciones por fecha, acceso a agenda y estado de suscripción. Ocupación disponible en Insights. |
| Agenda | A/C | Día y semana, navegación por fecha, estados, cancelación y reprogramación. Búsqueda y filtro por profesional combinables en ambas vistas. Se preservan las mutaciones con validación del servidor. |
| Equipo y horarios | A/B | Propietario, administrador y profesional donde están contemplados por las políticas actuales. Horario del comercio y bloqueos fechados o recurrentes asociados a profesionales. Horarios semanales independientes por profesional y calendario de vacaciones dedicado siguen en evolución. |
| Operación de turnos | A | Inicio y fin de atención, ausencias, historial, reglas de cancelación/reprogramación y señas por servicio. |
| Reserva pública | A/C | Link público, reservas como invitado, detalle, comprobante imprimible y enlaces de gestión existentes. Se suma archivo de calendario para reservas confirmadas. El modo de reserva con cuenta exigido por cada comercio necesita una política de acceso propia. |
| Clientes | B/C | Búsqueda, ficha derivada de la agenda, historial, lista negra y notas internas. Las notas toleran cambios de ficha en vuelo y devuelven conflicto cuando se edita una versión desactualizada. La identidad histórica por teléfono y nombre necesita conciliación antes de calcular frecuencia o preferencias a partir de registros antiguos. |
| Caja | A/C | Acceso avanzado, ingresos, señas, saldos y gastos con filtros por mes o por día. Los ingresos se agrupan por fecha del turno. Un error o una respuesta incompleta muestra un aviso en lugar de un total parcial. El saldo contable por fecha de liquidación requiere otra fuente. |
| Insights | A/C | Ocupación diaria y horaria, comparación mensual, cancelaciones, clientes recurrentes, retorno 30/60/90 y duración según los datos registrados. Se exporta CSV de la serie diaria consultada con el permiso avanzado vigente. La estimación semanal se identifica como tal. |
| Suscripción | A/C | Plan efectivo, estado, períodos, prueba, cupos, consumo, historial y acciones del motor comercial existente. Nueva presentación alineada con los temas de Turnly. Trial 5 profesionales/10 servicios, Básico 2/5 y Pro 15/50. |
| Superadministración | A/C | Directorio paginado con filtros por estado de suscripción y actividad. Búsqueda por nombre, slug, identificador o email exacto del titular. El RPC exige superadministrador y devuelve datos del comercio. Se conservan pagos, auditoría e incidencias y se mejoran los accesos a privacidad. |
| Recordatorios y notificaciones | B | Entrega de recordatorios condicionada a configuración y validación de proveedores. Bandeja administrativa y notificaciones nuevas quedan pendientes de definición. |
| Seguimiento y operación avanzada | D | Turnos recurrentes requieren resolver la serie y sus conflictos. Lista de espera y recuperación activa de huecos requieren reglas de prioridad y consentimiento. Arrastrar para reprogramar queda pendiente de accesibilidad táctil y confirmación de conflictos. Exportación por profesional, conversión comercial y detalle de actividad necesitan métricas y audiencias definidas. |
| Crecimiento | D | Google Calendar bidireccional, promociones, cupones, paquetes, fidelización, sucursales, automatizaciones y módulos por rubro requieren validación. Se reutilizan los perfiles comerciales actuales. |

## Migraciones y verificación

El orden heredado es `owner_operations`, `owner_insights`, `atomic_onboarding`, `restrict_public_truncate`, `commercial_subscriptions`, `mercadopago_saas_adapter` y `privacy_requests`. Después sigue `20261123000500_superadmin_directory.sql`. Agrega una función de lectura sobre entidades existentes. Para revertir ese cambio tras retirar la interfaz que la llama, se puede eliminar la función por su firma `public.turnly_superadmin_directory(text,text,boolean,integer)` en una intervención autorizada.

`npm run lint`, `npm run typecheck`, `npm run build`, `npm test` y `npm audit` cubren el código. El workflow ejecuta también concurrencia en PostgreSQL 17 y HTTP contra un build local con valores sintéticos. La prueba de Chromium verifica portada y formularios de recuperación a 360, 768 y 1280 px, foco y persistencia del tema. Las capturas se limitan a la portada ilustrativa. Para ejecutar la misma prueba con el build local en `127.0.0.1:3100`, usá `npx --no-install playwright install --with-deps --only-shell chromium` y `node tests/browser-launch-smoke.mjs`. La agenda autenticada y la reserva completa con un comercio real requieren Supabase Auth en un entorno aislado.

## Puertas de lanzamiento

- Recuperación y comparación final de QA pendientes. Las migraciones requieren autorización expresa y una verificación posterior con datos sintéticos.
- Aislamiento de Preview y pruebas autenticadas de operación pendientes. La rama tiene el despliegue automático deshabilitado en el repositorio.
- Mercado Pago recurrente conserva el bloqueo del candidato original. La activación exige Sandbox validado, catálogo comercial aprobado y autorización aparte.
- Las incidencias de datos históricos y los requisitos legales y operativos conservan los pasos de [la candidata de lanzamiento](turnly-final-candidate.md).
