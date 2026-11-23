# Turnly · Reconciliación con main

La candidata parte de main `a226534` e incorpora el árbol verificado de #24 `5e17924` mediante una integración con ambos historiales. #17 (`ed62d82`) aporta seguridad, integración y personalización. #18 (`f1e10e4`) suma historial y recordatorios. #20 (`0e125a2`) añade operaciones e informes. #22 (`823af2a`) estabiliza alta, reservas y agenda. #24 aporta cierre ante fallos de lista negra, validación de reprogramaciones y revocación de TRUNCATE.

## Resolución de los conflictos

| Superficie | Decisión |
|---|---|
| Reservas y alta | Reutilizar los servicios transaccionales de la candidata, la sesión validada en servidor, el enlace de gestión y la creación atómica. Conservar comprobante imprimible mediante historial autenticado o enlace de gestión. |
| Agenda y clientes | Conservar día, semana, caja, bloqueos y clientes. /agenda conserva la vista semanal y /mis-reservas lleva al historial vigente. La lista negra separada usa el mismo endpoint del CRM. El endpoint evita sobrescribir ediciones simultáneas y rechaza catálogos corruptos. |
| Autenticación y configuración | Mantener Next Proxy y una sola implementación SSR. Integrar del login de main el manejo de excepciones y la recuperación del formulario. Mantener configuración y administración con acceso controlado. |
| Pagos y correo | Mantener verificación de firma, control de importe, moneda, subvenciones de plan, autorización e idempotencia de la candidata. Retirar rutas antiguas que duplicaban escrituras y llamadas externas. Conservar el cron de recordatorios autenticado de la candidata. |
| Interfaz y herramientas | Unificar landing, apariencia, avisos legales, CSS y dependencias alrededor del stack de la candidata. Conservar enlaces legales de main como redirecciones y la validación de mayúsculas de TypeScript. Se retiraron componentes duplicados, el antiguo middleware de traducciones y Edge Functions con flujos superpuestos. |
| Base de datos | Conservar byte a byte las 15 migraciones de #24 y sus timestamps únicos. Los archivos históricos de main bajo schema y sql quedan fuera de la cadena de migraciones de Supabase. |

Los 42 caminos que Git marcó en conflicto fueron:

- `app/(auth)/registro-negocio/page.tsx`
- `app/(dashboard)/dashboard/page.tsx`
- `app/ajustes/page.tsx`
- `app/api/checkout/route.ts`
- `app/api/notificar/route.ts`
- `app/api/pago-local/route.ts`
- `app/api/sena/route.ts`
- `app/api/suscripcion/route.ts`
- `app/api/webhooks/mercadopago/route.ts`
- `app/api/webhooks/suscripcion/route.ts`
- `app/bloqueos/page.tsx`
- `app/caja/page.tsx`
- `app/cancelar/[id]/page.tsx`
- `app/clientes/page.tsx`
- `app/informes/page.tsx`
- `app/landing/page.tsx`
- `app/layout.tsx`
- `app/mis-turnos/page.tsx`
- `app/not-found.tsx`
- `app/onboarding/page.tsx`
- `app/page.tsx`
- `app/reservar/[slug]/page.tsx`
- `app/servicios/page.tsx`
- `app/staff/page.tsx`
- `app/superadmin/page.tsx`
- `app/terminos/page.tsx`
- `app/turnos/page.tsx`
- `app/upgrade/page.tsx`
- `components/landing/Hero.tsx`
- `components/landing/Mockup.tsx`
- `components/landing/Pricing.tsx`
- `lib/env.ts`
- `lib/getnegocio.ts`
- `lib/mercadopago.ts`
- `lib/webhooks/mercadopago-handler.ts`
- `next.config.ts`
- `package-lock.json`
- `package.json`
- `proxy.ts`
- `public/manifest.json`
- `tsconfig.json`
- `vercel.json`

## Pruebas reproducibles

- Ejecutar npm ci, npm run lint, npm test, npm run typecheck y npm audit. Compilar y probar con la configuración ficticia de loopback de .github/workflows/ci.yml.
- CI aplica la cadena a una base descartable PostgreSQL 17 y hace competir dos solicitudes incompatibles. La suite PGlite comprueba además RLS entre comercios, reprogramación, cancelación, tokens, caja, alta atómica y retiro de TRUNCATE.
- El smoke HTTP prueba 20 escenarios sobre Next compilado con un PostgREST sintético. Comprueba los errores de la reserva, redirecciones legadas, protección de la lista negra, acceso anónimo al comprobante y que las rutas antiguas de escritura ya no existen. El fixture verifica que no se invoquen RPC de escritura.
- El comprobante por cuenta queda limitado al historial autenticado vigente. Usa fecha, hora y estado reales. El enlace de invitado abre la página de gestión protegida por token. Queda pendiente su verificación en navegador contra Auth aislado.

## Migraciones pendientes

Partir de QA reconciliado con las once migraciones previas. Revisar equivalencia de DDL además de timestamps. Orden:

1. `20261118000100_owner_operations`, depende de reservas, planes y roles.
2. `20261118000200_owner_insights`, depende de operaciones y su información de turnos.
3. `20261119000100_atomic_onboarding`, depende del esquema de negocios y adminrol.
4. `20261123000100_restrict_public_truncate`, depende de roles de aplicación. Revierte si quedan grants efectivos heredados o derivados de la propiedad.

## Puertas del lanzamiento

**NO-GO de lanzamiento y migraciones remotas.** Acreditar recuperación de QA, comparar catálogo y datos efectivos y aprobar cualquier operación remota específica. Antes de cortar tráfico, cotejar si hay reservas en tablas plurales, bloqueos en horarios_bloqueados o identidades bloqueadas en lista_negra que deban trasladarse al modelo activo. Las entradas antiguas por email o usuario requieren revisión explícita. No existe equivalencia automática para esas reglas en el registro de teléfonos. Esto es un requisito de preservación de datos y restricciones, no una migración ejecutada por este PR.

Confirmar destino activo de producción, variables y callbacks de Preview aislado y MFA/acceso operativo según la configuración del servicio. Ensayar dos comercios sintéticos, recuperación de cuenta, alta de catálogo, reserva de invitado, cancelación y reprogramación. Repetir pruebas de móvil y accesibilidad. Validar textos legales, bajas, soporte y manejo de datos. Mantener fuera del piloto notificaciones y pagos automáticos hasta sus pruebas y autorizaciones correspondientes. La rama nueva excluye el despliegue Git de Vercel.

El informe de #24 conserva el [contexto operativo y checklist](turnly-final-candidate.md) y las [capturas históricas de navegador](qa-release/README.md).
