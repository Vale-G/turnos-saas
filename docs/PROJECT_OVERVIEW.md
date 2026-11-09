# Turnly — resumen del producto

## Propósito

**Inferido a partir de rutas y componentes:** Turnly es una aplicación SaaS de gestión de turnos para negocios, con páginas públicas de reserva y paneles de administración. El código incluye flujos para servicios, staff, bloqueos horarios, clientes, cobros y planes.

## Stack confirmado en `package.json`

- Next.js 16 con App Router.
- React 19 y TypeScript.
- Supabase JS y `@supabase/ssr` para datos/autenticación.
- Mercado Pago para checkout, señas y pagos de suscripción.
- Resend para notificaciones por correo.
- Tailwind CSS 4 y Sonner para notificaciones UI.

## Estado técnico al 2026-10-27

- La rama de trabajo para cambios funcionales debe partir de `codex/revisar-informes-de-turnos-cancelados`, no de `main`.
- El último deployment marcado como producción que se verificó corresponde a `bc234fb`; la punta de la rama estable observada en los PR es `07bd2ee`.
- Los PR #10 y #11 están en borrador y sin fusionar.
- Se confirmó una deuda de lint y riesgos de seguridad P0/P1. No declarar el producto validado hasta contener esos riesgos y probar los flujos críticos.

## Fuera de alcance sin aprobación

No cambiar producción, políticas o esquema de la base activa, credenciales, datos reales, reglas comerciales de cobro ni comportamiento de suscripciones sin análisis y aprobación explícita.
