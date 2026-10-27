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

- No hay una instancia Supabase de desarrollo aislada confirmada.
- No se encontró en el repo la fuente SQL de las policies actuales.
- Lint falla en la base de código observada; el build no tenía resultado porque el workflow original omitía el paso después de lint.
- No existe script `test` ni suite funcional confirmada.
- La referencia desplegada en producción (`bc234fb`) difiere de la punta de la rama estable observada (`07bd2ee`).

## Puerta de salida para P0

No considerar el riesgo contenido hasta demostrar, con evidencia reproducible, que anon no puede leer turnos privados ni campos sensibles, que una reserva válida sigue funcionando, que hay aislamiento entre negocios y que las reservas concurrentes no generan solapamientos. No fusionar ni desplegar sin revisión y aprobación explícitas.
