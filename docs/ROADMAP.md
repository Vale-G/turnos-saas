# Roadmap técnico y puertas de salida

El orden es deliberado: no avanzar a funciones nuevas mientras el riesgo crítico de reservas/datos siga abierto.

## Prioridad inmediata

1. **P0 — contención pública:** perfil de negocio con campos permitidos, disponibilidad sin filas privadas y creación de reservas validada.
2. **P0/P1 — RLS multiempresa:** comprobar propiedad de negocio en lectura/escritura y funciones privilegiadas.
3. **CI:** mantener lint y build como controles independientes; corregir deuda de lint incrementalmente sin desactivar reglas.
4. **Pagos:** validar señas, checkout, webhooks e idempotencia con sandbox/mocks.
5. **QA:** incorporar tests unitarios de lógica pura, integración de endpoints y E2E críticos cuando exista entorno aislado.
6. **Confiabilidad:** investigar las vulnerabilidades de dependencias de forma acotada; no usar `npm audit fix --force`.

## Bloqueos actuales

- Existe un proyecto Supabase de prueba (`Tunero 2`), pero no es un sandbox compatible todavía: su esquema difiere del que usa la aplicación y sus permisos requieren revisión antes de cargar fixtures.
- No se encontró en el repo la fuente SQL de las policies actuales.
- CI actual (run [40779968499](https://github.com/Vale-G/turnos-saas/actions/runs/40779968499)): build aprobado, pruebas unitarias 5/5 aprobadas, lint fallido con 27 errores/15 warnings; baseline de la rama base 37/15. La CI global sigue fallida.
- Existe `npm test` con cinco pruebas unitarias de helpers puros; integración/E2E y flujos críticos aún no están probados.
- La referencia desplegada en producción (`bc234fb`) difiere de la punta de la rama estable observada (`07bd2ee`).

## Puerta de salida para P0

No considerar el riesgo contenido hasta demostrar, con evidencia reproducible, que anon no puede leer turnos privados ni campos sensibles, que una reserva válida sigue funcionando, que hay aislamiento entre negocios y que las reservas concurrentes no generan solapamientos. No fusionar ni desplegar sin revisión y aprobación explícitas.


## Actualización de prioridad — 2026-10-27

- **Urgente, antes de funciones nuevas:** preparar una actualización controlada de `next` y `eslint-config-next`. La auditoría de [run 40503354300](https://github.com/Vale-G/turnos-saas/actions/runs/40503354300) reportó 20 vulnerabilidades (incluida una crítica); el proyecto declara Next.js 16.1.6.
- La advisory oficial [GHSA-2464-fhr4-w9xw](https://github.com/vercel/next.js/security/advisories/GHSA-2464-fhr4-w9xw) confirma el parche desde 16.4.1; el release estable observado es [16.4.3](https://github.com/vercel/next.js/releases). Regenerar el lockfile y probar compatibilidad en rama aislada antes de considerar mitigado el riesgo.
- El run 40503354300 compiló, pero lint sigue fallando con 32 errores y 15 warnings; baseline exacto tiene 37 errores y 15 warnings. No aprobar ni fusionar el PR.


## Seguimiento — 2026-10-29 (Día 4)

**Estado: BLOQUEADO por la puerta P0; no avanzar a funciones posteriores.**

- Confirmado en código estable: `app/reservar/[slug]/page.tsx` lee el negocio con `select('*')`, consulta turnos desde el navegador y crea turnos con una inserción directa a Supabase.
- Confirmado en Vercel: deployment de producción `READY` en `bc234fb0b8c981935602168ca0b6982d24d0956f`; la rama estable está en `07bd2ee75b16e91a3d31f63b60cf7d8796d614cf`. No son el mismo commit.
- `Tunero 2` no sirve aún para pruebas funcionales: el esquema es incompatible y `rls_auto_enable()` es una función `SECURITY DEFINER` ejecutable por roles públicos.
- Trabajo seguro realizado: inspección estática, comparación de esquemas, comprobación de CI y actualización de evidencia; sin cambios de runtime, migraciones ni escrituras.
- Requisito para desbloquear: una fuente de verdad verificable del esquema de Turnly (migraciones SQL versionadas o exportación revisada, sin secretos) y un entorno aislado compatible.
- No se considera contenida la exposición pública de reservas/tokens ni aprobado el sprint.
