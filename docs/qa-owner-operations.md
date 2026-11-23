# QA del panel del dueño

Base del parche acumulativo: PR #18 en `f1e10e424b786a4c4fa45f2784119addd2e488e6`. La rama incorpora también la primera revisión de Informes.

## Esquema y compatibilidad

En una base de pruebas aislada con el esquema del PR #18, aplicar primero `20261118000100_owner_operations.sql` y después `20261118000200_owner_insights.sql`, antes de servir esta versión. Para un entorno persistente se requiere verificar proyecto, respaldar y comprobar la restauración en una base descartable. La segunda migración depende de columnas de la primera. El código anterior no implementa la nueva política de señas. Mantener el tráfico de prueba aislado durante la transición.

La regla inicial es seña opcional, con 0 horas adicionales de anticipación. El monto proviene del servicio. Para exigirla, configurar un importe positivo, un plan con cobros y la cuenta del negocio. Una reserva impaga permanece pendiente, ocupa el horario y puede cancelarse. No hay vencimiento automático del turno pendiente. El enlace privado permite reintentar el pago; el estado confirmado depende del cobro verificado por el servidor. No activar cobros reales para QA.

Los precios anteriores sin importe pactado siguen siendo desconocidos; Informes identifica la tarifa vigente como estimación. Caja agrupa por fecha del turno, no por fecha de liquidación bancaria. La ocupación reconstruye capacidad según el equipo y horarios actuales y los bloqueos disponibles. Las reservas anteriores sin duración guardada no aportan minutos. Para recuperación se cuentan minutos coincidentes del mismo profesional cubiertos por una reserva vigente asignada después de la cancelación. Las cohortes se limitan a cuentas identificadas. El pronóstico de volumen semanal solo aparece si hay historial previo y su error absoluto medio en ocho semanas es menor que usar la semana anterior.

## Reproducción

1. Ejecutar `npm ci`, `npm test`, `npm run lint` y `npm run typecheck`. Para compilar localmente usar la URL de Supabase de loopback y la clave ficticia de CI.
2. El workflow existente ejecuta `tests/native-concurrency.sh` contra un servicio PostgreSQL descartable. Verificar esa ejecución en el commit exacto antes de integrar.
3. En un Preview aislado probar con dos negocios y tres sesiones (dueño, personal e invitado). Revisar acceso directo a Informes, filtro por profesional y servicio, y el detalle del indicador.
4. Crear un turno, cambiar la tarifa del servicio, iniciar y cerrar la atención. Comparar el valor pactado, la duración medida y la Caja contra los registros de prueba.
5. Cancelar por el enlace del cliente y desde la agenda. Reocupar solo media franja y comprobar recuperación parcial. Probar límites de cancelación y reprogramación a ambos lados de la hora límite.
6. Con autorización separada para sandbox, probar seña rechazada, aprobada, retorno desde Mercado Pago, reintento, webhook duplicado y saldo restante. Verificar en móvil el acceso al enlace privado después de volver del proveedor.

## Revisión de la candidata e3d9fb3

Las dos migraciones locales crean los campos de política del negocio y del servicio, mediciones y condiciones pactadas en turno, el trigger de recepción y los procedimientos de reserva, gestión, cobros e informes. Se apoyan en las funciones previas de permisos, token y creación de reservas, en pgcrypto y en los multirrangos de PostgreSQL. No hay nuevos paquetes npm en la candidata.

La ocupación reconstruye horarios anteriores con la configuración disponible hoy. La recuperación mide coincidencia de intervalos por profesional; un turno de reemplazo vigente puede aún no haber sido atendido. En duración, la muestra excluye sesiones sin inicio y fin. La cohorte mide visitas completadas de clientes identificados.

El pronóstico usa doce semanas completas. Para cada una de las ocho semanas de evaluación promedia las cuatro anteriores y compara su error con repetir la semana anterior. Excluye la semana objetivo de los predictores, pero reconstruye los datos desde el estado actual de las reservas. Reprogramaciones y registros tardíos impiden garantizar una simulación histórica tal como se habría visto en cada fecha. Las ocho semanas se usan también para decidir si mostrar el modelo; su error no es una evaluación independiente. La validación es a un paso y la interfaz anuncia la próxima semana completa aun cuando ya comenzó la semana actual. Antes de usarlo comercialmente deben alinearse los horizontes y evaluarse en un tramo posterior reservado.

Next y eslint-config-next están fijados en 16.4.3. Propuesta de mantenimiento separada: fijar ambos en 16.4.6, regenerar y revisar el lockfile, repetir auditoría, compilación, pruebas y recorrido de autenticación en un Preview aislado. No se cambiaron las versiones en este PR.

El despliegue automático de Git queda suspendido únicamente para esta rama de QA. Publicar un Preview manual únicamente después de validar las credenciales exclusivas del entorno de prueba.
