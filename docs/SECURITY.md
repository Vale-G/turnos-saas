# Seguridad — estado y prioridades

## Riesgos confirmados por revisión estática/metadatos (2026-10-26)

- **P0 — datos de reservas:** `public.turno` tiene política SELECT pública con `true` y política INSERT pública con `WITH CHECK (true)`; el rol `anon` tiene SELECT/INSERT.
- **P0 — campos privados de negocio:** `public.negocio` permite SELECT público con `true`; la página pública usa `select('*')` y la tabla contiene `mp_access_token`. El valor del token no se leyó; tratarlo como potencialmente expuesto.
- **P1 — propiedad:** política ALL de `bloqueo` exige autenticación, pero no verifica que el registro pertenezca al negocio del usuario.
- **P1 — pagos:** webhook genérico sin verificación de firma; validaciones de importe, moneda, referencia e idempotencia incompletas.
- **P1 — correo:** `/api/notificar` recibe destinatarios y contenido del cliente e interpola texto en HTML sin escape contextual suficiente.

## Estado de mitigación

Los hallazgos están documentados, no corregidos. El [PR #10](https://github.com/Vale-G/turnos-saas/pull/10) contiene un plan de contención P0 y sigue en borrador. No se modificó producción ni Supabase.

## Reglas

- Nunca exponer service-role keys, tokens de proveedor o columnas administrativas al navegador.
- No cambiar policies/migraciones sobre la base activa desde una rama de trabajo.
- Probar anon, propietario, otro negocio y administrador con datos ficticios en un entorno aislado.
- Considerar potencialmente expuesto el token de Mercado Pago hasta contener y verificar el acceso; coordinar rotación segura sin registrar su valor.
