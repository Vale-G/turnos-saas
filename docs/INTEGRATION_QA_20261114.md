# Candidata de integración — 2026-11-14

Sin merge de PR originales, escrituras Supabase ni despliegue productivo.

## Referencias contrastadas con GitHub

- issue 12 remoto: `4eb91388f67765ca49eb3bad0e08786560131cf5`.
- CI remoto: `9013bf0c95fdbf340f424a94e51a5e3ad0add18a` (6 commits posteriores a la referencia local inicial).
- Personalización remoto: `eb2de0352bfbea4f3cdeea46eb5a5d7bb1a2e8d0`.
- Se preservan también los encabezados de seguridad y errores públicos sanitizados del trabajo local.

## Once conflictos de la candidata original

| Archivo | Resolución conservada | Justificación |
|---|---|---|
| app/ajustes/page.tsx | Personalización y aviso de plan para MP | Mantiene rubro, estilo y modo sin anunciar conexión a Básico |
| app/api/ajustes/mercadopago/callback/route.ts | Callback firmado, propietario y guardado cifrado | No autorizar otra cuenta/negocio ni informar éxito ante fallo |
| app/api/ajustes/mercadopago/connect/route.ts | Owner, Pro/trial y retorno al origen QA | Evita bypass de plan y salto a producción |
| app/api/ajustes/mercadopago/route.ts | Proyección sin secretos y planRequired | No exponer credenciales en navegador |
| app/api/sena/route.ts | Token de gestión, importe calculado y plan server-side | Evita pagar órdenes ajenas o manipular importes |
| app/landing/page.tsx | TurnlyLanding | Conserva marca propia y elimina F&V |
| app/page.tsx | Entrada de la versión personalizada | Evita restaurar la landing anterior |
| app/upgrade/page.tsx | Comparación de funciones comprobables | Retira promesas de automatizaciones inexistentes |
| docs/ISSUE_12_QA.md | Informe más reciente de personalización | Conserva evidencia histórica, no implica QA del commit actual |
| lib/server/mercadopago-oauth.ts | persistBusinessToken y validación de configuración | Limpieza de token legado debe fallar explícitamente |
| tests/supabase-qa-transaction.sql | Prueba QA de la versión personalizada | Se conserva como referencia; no ejecutada en esta integración |

## Conflictos adicionales tras actualizar referencias

- `app/reservar/[slug]/page.tsx`: se conserva reserva vía API; no se restaura lectura de config ni INSERT de turnos desde navegador. Lista negra se valida en `app/api/public/reservas/route.ts`.
- `app/api/public/reservas/[id]/route.ts`: conserva campos visuales públicos y autorización por token.
- `app/cancelar/[id]/page.tsx`: conserva gestión por token, tema y fecha comercial Buenos Aires.
- `app/landing/page.tsx`, `app/page.tsx`: conserva identidad Turnly.
- `app/turnos/page.tsx`: conserva consultas explícitas y fecha comercial.
- `tests/database-security.test.mjs`: conserva pruebas de planes y migraciones posteriores, además de reservas/RLS.

## Validación y límites

La candidata inicial pasó 66 pruebas, lint, typecheck y build. Se repiten sobre la versión actualizada.
PGlite no equivale a concurrencia entre conexiones PostgreSQL independientes.
CI usa postgres:17-alpine aislado y `tests/native-concurrency.sh`, con URL restringida a loopback y base turnly_test. Ahora aplica todas las migraciones de noviembre antes de competir por la reserva.
Pendientes: resultado CI del commit publicado, QA funcional del Preview, OAuth real y acreditación en cuenta vendedora. No se publica producción.
