# Turnly · Cierre técnico del 24/11/2026

**NO-GO comercial.** Base verificada: PR #28, commit `32e173cf85ae374eb27f8d6ef043beab16a3cc70`. Se recuperó una copia de sus 208 archivos y se verificó cada blob contra GitHub. El checkout local anterior se preservó.

## Producto y PR

Los PR #25, #26, #27 y #28 están abiertos como borradores. La cadena verificada es `e5dd74c → 1dc196b → 8bb6562 → 32e173c`. Los cambios de este cierre preparan la operación del worker de facturación y deshabilitan despliegues Git para la rama de cierre. Se conserva la matriz funcional de `evolucion-producto.md`.

Siguen pendientes los horarios semanales por profesional, la política de reserva con cuenta por comercio, la conciliación de identidad histórica, las ampliaciones de notificaciones y reportes, la lista de espera y las series. La reprogramación mantiene la acción existente. Arrastrar requiere una validación de conflictos y accesibilidad táctil y por teclado. Calendar bidireccional, promociones, cupones, paquetes, fidelización, sucursales y módulos por rubro quedan como evolución de producto.

## Recuperación, migraciones y datos legados

- Se verificaron ambos SHA-256 y las 84 huellas del paquete. El ensayo anterior cargó 64 relaciones y 303 filas, con 52 FK, cero huérfanas y cero índices inválidos. El cotejo falló en catálogo y permisos. Docker no fue accesible desde la consola y sudo está bloqueado por no-new-privileges. El informe privado del operador documenta las ocho discrepancias y su estado.
- El cotejo de solo lectura del 24/11 confirmó que cinco de los 84 componentes de QA difieren del snapshot del 19/11. QA necesita una captura privada consistente actualizada antes de usarla como punto de recuperación. QA está activo en PostgreSQL 17.6. El proyecto histórico asociado a producción figura inactivo y requiere confirmar cuál es el destino real.
- El orden posterior a la captura es owner_operations, owner_insights, atomic_onboarding, restrict_public_truncate, commercial_subscriptions, mercadopago_saas_adapter, privacy_requests y superadmin_directory. El CI de la base tiene comprobaciones de concurrencia en PG17 sintético. Falta aplicar y verificar la cadena sobre una copia del respaldo real.
- El inventario de legado quedó pendiente de ejecución sobre esa copia. Antes de preparar transformaciones, conciliar entidades por comercio, profesional, estado y tiempo, conservar los identificadores de origen y enviar coincidencias ambiguas a revisión. No hubo escrituras en QA.

## Vercel y aislamiento

El conector confirmó el proyecto `turnos-saas` y asignación del dominio `turnos-saas-eight.vercel.app` al deployment `dpl_S8GMcwTMkHAnURLjVkwrFjJX3sVj`. El deployment más reciente que informa el proyecto aparece en ERROR. El metadato de variables muestra valores configurados en común para Preview y Production, incluso variables de Supabase y Mercado Pago. No apareció `TURNLY_PREVIEW_QA_REF` en el inventario devuelto. Esto impide aprobar el aislamiento. Falta confirmar origen de claves opacas, redirects de Auth, callbacks, credenciales de correo y separación de facturación. No se descargaron ni descifraron valores.

## Facturación y scheduler

Se mantiene la separación del adaptador SaaS y los cobros de los comercios. La cola actual selecciona hasta diez entregas por ejecución. La preparación externa usa `node scripts/run-billing-worker.mjs`, con un origen HTTPS explícito en `TURNLY_BILLING_WORKER_ORIGIN` y el bearer en `TURNLY_SAAS_WORKER_SECRET`. El cliente valida la respuesta, registra solo contadores y limita la espera a 70 segundos.

Vercel Cron llama por GET al deployment productivo. La ruta existente admite POST autenticado. Hobby permite una ejecución diaria y Pro/Enterprise admiten intervalos por minuto. Se preparó un cliente para un scheduler gestionado externo con una ejecución concurrente por entorno y una frecuencia inicial propuesta de cinco minutos, sujeta a validación en Sandbox. Dar seguimiento a 401, 503, tiempo de espera y eventos en revisión. La cola tiene su propia cadencia de reintento. Las ejecuciones duplicadas y la interacción con webhooks requieren la prueba de integración antes de activar el scheduler. [Vercel Cron](https://vercel.com/docs/schedules/cron-jobs) · [Límites por plan](https://vercel.com/docs/schedules/cron-jobs/usage-and-pricing)

No se usaron credenciales de Mercado Pago. Preapproval, autorización, pago, renovación, rechazo, cancelación, reversión y contracargos requieren verificación con una aplicación, comprador y vendedor de prueba. Los derechos comerciales, importes y activación productiva requieren aprobación. [Mercado Pago Suscripciones](https://www.mercadopago.com.ar/developers/es/docs/subscriptions/overview)

## Evidencia local

- PASS de integridad del paquete y sus controles negativos.
- PASS de tres pruebas del ejecutor mediante transporte simulado.
- `npm ci --offline` falló con ENOTCACHED para zod. ESLint, TypeScript y build no iniciaron por binarios ausentes. El registro npm no resolvió DNS al intentar la auditoría.
- `npm test` terminó con 19 unidades de reporte aprobadas y una fallida. La suite de base no pudo importar `@electric-sql/pglite`. La ejecución completa no pasó.

## Evidencia externa

- GitHub Actions del PR #28 reporta éxito de lint, TypeScript/build, HTTP sintético, pruebas unitarias, concurrencia PostgreSQL 17 y smoke responsive Chromium de portada y recuperación. El job de npm audit figura como informativo. [Ejecución #253](https://github.com/Vale-G/turnos-saas/actions/runs/45121987291)
- GitHub Actions del PR #27 reporta éxito de lint, TypeScript/build, HTTP, unitarias y concurrencia. [Ejecución #247](https://github.com/Vale-G/turnos-saas/actions/runs/45119134054)
- Quedan sin validar los recorridos completos de propietario, cliente, seguridad y comercial en navegador, Supabase Auth real aislado, la matriz de 360/390/768/1280 px en esos recorridos y la prueba Sandbox externa.

## Privacidad, publicación y recuperación

La revisión profesional debe cubrir identidad del responsable, contacto, alcance de solicitudes, plazos de atención y conservación, tratamiento de datos y proveedores, política de cancelación, devoluciones y condiciones comerciales. Revisar la implementación de exportación y supresión sobre datos sintéticos antes de acordar los textos de `/privacidad` y `/terminos`.

Publicación posterior a las puertas de la checklist: confirmar entorno objetivo, congelar el SHA aprobado, preparar la copia consistente, acreditar restauración y migraciones, validar Preview aislado y obtener aprobación jurídica, comercial y operativa. Cualquier migración, activación de pagos, programación productiva, despliegue o recuperación remota requiere autorización propia. Para recuperación, preservar las fuentes y evidencias, restaurar primero en PG17 aislado, validar catálogo, ACL, RLS y datos, y verificar por separado la configuración de plataforma y Storage. Mantener preparado el deployment anterior antes de una promoción autorizada.
