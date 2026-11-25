# Recuperación y activación de QA

Proyecto autorizado para la captura: `hwrlimcunbenxsvfbklr`. El respaldo contiene información privada. Conservá el directorio cifrado fuera del repositorio y de GitHub Actions.

## Reconciliación observada el 24/11/2026

Se comparó el contenido registrado en `supabase_migrations.schema_migrations.statements` con los archivos de la candidata. Las 11 versiones difieren. Diez coinciden mediante MD5 al excluir espacios finales. Para reprogramación se inspeccionó el texto de ambos lados: conserva las mismas instrucciones, comentarios aparte, con un formato de espacios y saltos diferente. La equivalencia de archivos no demuestra por sí sola equivalencia de catálogo o permisos efectivos.

| Migración | Versión QA | Versión Git |
| --- | --- | --- |
| booking_security_and_intervals | 20261105202016 | 20261031015309 |
| booking_interval_hardening | 20261109001909 | 20261105211500 |
| legacy_sandbox_surface_lockdown | 20261109002327 | 20261109002302 |
| mercado_pago_oauth_credentials | 20261109004906 | 20261109004201 |
| public_booking_reschedule | 20261109015711 | 20261109014454 |
| role_permissions | 20261109044821 | 20261109020119 |
| notification_delivery | 20261110104143 | 20261110103749 |
| business_personalization | 20261112215311 | 20261112214500 |
| plan_limits_and_payment_access | 20261113182429 | 20261113190000 |
| selective_mvp | 20261118143014 | 20261114040000 |
| reminder_delivery | 20261118143016 | 20261114040100 |

El ensayo sobre copia recuperada ejecuta exclusivamente, en orden, `owner_operations`, `owner_insights`, `atomic_onboarding`, `restrict_public_truncate`, `commercial_subscriptions`, `mercadopago_saas_adapter`, `privacy_requests`, `superadmin_directory` y `qa_security_gates`. No usar `supabase db push` mientras el historial remoto conserve versiones divergentes. Mantener explícitamente el mapa de versiones hasta aprobar una reconciliación separada.

## Captura de solo lectura

Requisitos: Python 3.11+, cliente PostgreSQL 17 con `psql`, `pg_dump` y `pg_restore`, conexión directa a QA y validación TLS por nombre. El host requiere IPv6 salvo que haya una modalidad directa IPv4 ya configurada. Si no hay acceso directo, no sustituirlo por un pooler en modo transacción. Configurar `PGUSER`, autenticación privada por `PGPASSFILE` con modo 0600 o credencial efímera equivalente, y el certificado de CA mediante `PGSSLROOTCERT` según el proveedor. Usar un directorio privado con espacio y un volumen cifrado.

```bash
export PGHOST=db.hwrlimcunbenxsvfbklr.supabase.co PGPORT=5432 PGDATABASE=postgres PGSSLMODE=verify-full
python3 scripts/backup-qa.py /ruta/privada
cd /ruta/privada/turnly-qa-ID
sha256sum -c SHA256SUMS
```

El script mantiene abierta una transacción de solo lectura y comparte una instantánea entre el dump y el inventario. Genera un archivo custom, su TOC y el inventario de versión, migraciones, atributos de roles, membresías y extensiones. Las ACL, políticas y propietarios están en el dump. Las contraseñas de roles, secretos de aplicaciones, parámetros de Auth y SMTP, objetos binarios de Storage, variables de Vercel, DNS y webhooks del proveedor se registran y se recuperan por separado. Una lectura completa de `pg_restore` valida el archivo. La restauración es otro control.

## Restauración y criterio de aceptación

1. Usar una instancia PostgreSQL 17 descartable con las versiones de extensiones del inventario, dependencias Supabase y roles/membresías del kit de recuperación. Antes de cargar datos, deshabilitar SMTP, cron, pagos, webhooks y cualquier servicio externo.
2. Verificar SHA-256, restaurar con el procedimiento del kit, registrar cada omisión y confirmar que se pueda recuperar el conjunto completo requerido. `pg_restore --exit-on-error` debe pasar sobre el conjunto reconciliado. Los objetos gestionados que ya estén creados se cotejan antes de excluirlos.
3. Comparar tablas, filas, claves, índices, funciones, propietarios, RLS, ACL efectivas y membresías con la captura. Las diferencias del respaldo histórico no acreditan la equivalencia del nuevo punto. Verificar el catálogo también después de las migraciones y comprobar rollback restaurando nuevamente la captura.
4. Aplicar las nueve migraciones en orden solo a esa copia y ensayar datos legados, RLS, reservas concurrentes y el historial privado. CI prueba una base sintética en PostgreSQL 17. La recuperación privada y su cotejo son controles aparte.

## Dictamen del 25/11/2026

**PASS para recuperación de datos y ensayo local de las nueve migraciones de `b7f1840`. QA remoto queda pendiente de autorización expresa. NO-GO comercial.**

- El informe depurado del ensayo, conservado de forma privada, registra el SHA-256 del respaldo y la ejecución de las nueve migraciones sobre PostgreSQL 17.6. El cotejo local reportó 304 filas sin diferencias de contenido, 30 roles y 21 membresías.
- El ensayo funcional posterior, ejecutado por el propietario en `turnly_trial_b7f1840`, confirmó 9/9 migraciones, sin regresiones de Vault para los cinco roles examinados. `anon` y `authenticated` quedaron sin EXECUTE en wrapper y resolver. `service_role` conservó EXECUTE en ambos.
- En QA, `service_role` ya tenía USAGE sobre `graphql_public` y `graphql` y EXECUTE en ambas funciones. La copia restaurada y la migrada carecían de ambos USAGE. Al reproducir temporalmente los dos permisos de esquema en la copia migrada, el wrapper de pg_graphql real devolvió `{"data":{"__typename":"Query"}}` como `service_role`. El ROLLBACK retiró ambos grants temporales. No se requiere agregar esos grants a la migración para QA. [CI del commit ensayado](https://github.com/Vale-G/turnos-saas/actions/runs/45621370591).
- Vault coincide en la matriz efectiva medida para `anon`, `authenticated`, `service_role` y `supabase_admin`. El `postgres` del contenedor es superusuario: muestra INSERT, UPDATE y cinco funciones ejecutables, frente a la ausencia de INSERT y UPDATE y tres funciones ejecutables para el rol administrado de QA. La matriz no certifica equivalencia absoluta de propietarios, ACL administrativas ni atributos de roles. Las diferencias textuales de ACL de Vault siguen registradas como limitación del entorno. No se justifican cambios de Vault a partir de este cotejo.
- Antes de una futura aplicación autorizada, confirmar los permisos de esquema existentes de `service_role` y revisar que el esquema interno `graphql` quede fuera de los esquemas expuestos por la Data API. Registrar el estado del respaldo y el historial vigente. Las 11 versiones históricas divergentes se conservan y `supabase db push` queda fuera del procedimiento.

## Avisos y validación externa

- `perfiles` es legado, y las credenciales de `mercadopago_connection` se usan desde el servidor. RLS sin políticas es una denegación deliberada para clientes; esta rama retira también permisos directos de tabla y columna.
- Los 16 hallazgos GraphQL describen visibilidad de esquema. Se cierran ambos puntos de entrada a los roles de cliente sin quitar grants de tablas que requiere REST. El wrapper ejecuta el resolver con los permisos del llamador. Se conserva explícitamente el EXECUTE previo de service_role en ambos, incluso si procedía de PUBLIC en una restauración. El dictamen registra el ensayo funcional con pg_graphql real. Queda por confirmar que el esquema graphql interno está fuera de los esquemas expuestos por la Data API. Volver a revisar asesores, privilegios efectivos y respuesta de la ruta tras la aplicación autorizada.
- Se retira EXECUTE del historial anterior y la ruta Next.js autentica al usuario antes de consultar el historial de esa identidad con una función de alcance limitado solo para servidor.
- La [protección de contraseñas filtradas](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection) depende de Auth y del plan de Supabase. Habilitar con autorización y validar altas y cambios de contraseña en un entorno aislado.
- El Preview requiere sus JWT de QA con los roles correctos, origen propio de Vercel y ausencia de credenciales de integraciones heredadas. Las claves opacas quedan bloqueadas por falta de una atestación independiente del proyecto. La comprobación de claims de configuración no valida la firma; durante el ensayo Supabase debe aceptar ambos JWT contra QA. Antes de habilitar un deployment, cotejar también los Redirect URLs y el destino de Supabase Auth.
- Los callbacks que salen del navegador deben permanecer en el origen del Preview de QA. La confirmación de alta solicita `/auth/callback?next=/onboarding`, la recuperación solicita `/auth/callback?next=/recuperar/restablecer` y Google usa `/dashboard` o `/reservar/<slug>`. Verificar la lista de URLs permitidas y el Site URL de QA por separado. Validar la confirmación con un buzón capturado y una sesión de prueba, sin cambiar la configuración de Production.
- El grupo Sandbox de pagos requiere una autorización aparte y un origen de pruebas aislado del Preview normal. Con credenciales únicamente de prueba, validar autorización, cobro y renovación de suscripción, seña, firma y duplicados, rechazo, devolución y baja. Las pruebas simuladas del repositorio ejercitan código, no certifican el circuito real del proveedor.

## Autorizaciones pendientes y criterios de aceptación

El 25/11, Vercel registró cero despliegues de `codex/turnly-release-qa-gates` y cero variables exclusivas. Seis variables generales alcanzan Preview y Production: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SERVICE_ROLE_KEY`, `MP_PUBLIC_KEY` y `MP_ACCESS_TOKEN`.

1. **Vercel Preview de QA.** Aprobar un despliegue controlado de esa rama y variables exclusivas del Preview con `TURNLY_PREVIEW_QA_REF`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` y `NEXT_PUBLIC_SITE_URL`. Las claves deben provenir de QA y ser JWT de los roles `anon` y `service_role`. Mantener la clave de servidor fuera del navegador. El origen debe coincidir con `https://$VERCEL_URL` del despliegue. Los alias `SERVICE_ROLE_KEY`, `SUPABASESERVICEROLEKEY`, Mercado Pago, Resend y cron deben quedar ausentes o vacíos en la configuración efectiva de la rama. Mantener facturación y recordatorios deshabilitados. La autorización debe limitarse a esa rama. Si quedan integraciones heredadas que no pueden aislarse, se requiere otra autorización para un proyecto separado. Criterio de aceptación: confirmar el origen, la aceptación de ambos JWT por QA y que el build falle si detecta integración heredada. [Variables de Vercel por rama](https://vercel.com/changelog/environments-variables-per-git-branch).
2. **Supabase Auth real.** Aprobar únicamente en QA la incorporación del callback del origen exacto de Preview a la lista permitida. Cotejar Site URL por separado y mantenerlo salvo autorización explícita para cambiarlo. Aprobar dos propietarios y comercios sintéticos y un buzón de pruebas. Probar alta y confirmación, ingreso, recuperación, cierre de sesión y aislamiento. Limitar Google y otros proveedores a autorizaciones posteriores si se necesitan. Ninguna prueba con escrituras sobre QA principal se habilita con esta autorización por sí sola. Si el ensayo usa QA principal, requiere además la autorización de migraciones cuando corresponda y un permiso explícito para esas escrituras sintéticas. [URLs de retorno de Supabase](https://supabase.com/docs/guides/auth/redirect-urls).
3. **Mercado Pago Sandbox.** Aprobar un origen HTTPS distinto del Preview normal, una base aislada descartable y acceso por gestor seguro a credenciales de prueba. El adaptador actual fija la referencia de QA principal y la guarda de Preview bloquea pagos, así que se necesita adaptar y validar la referencia descartable antes de ejecutar el ensayo. Configurar solo webhooks y cuentas de prueba. Validar suscripción, seña, rechazo, repetición de webhook, devolución y baja. [Credenciales y cuentas de prueba](https://www.mercadopago.com.ar/developers/es/docs/subscriptions/additional-content/your-integrations/test/accounts).
4. **Migraciones remotas.** Requieren autorización independiente para una intervención en QA con los nueve archivos y el commit de código ensayado. Este dictamen y cualquier autorización de Preview, Auth o Sandbox carecen de alcance sobre producción y no habilitan migraciones.

Las tres pruebas de entorno siguen pendientes. El lanzamiento comercial permanece en NO-GO.
