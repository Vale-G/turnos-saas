# Turnly · Candidata final para revisión

**Lista para revisar en GitHub. Producción y migraciones remotas en NO-GO.**

## Base y alcance

El árbol parte del PR #22 en `823af2a`. Su CI [44514582670](https://github.com/Vale-G/turnos-saas/actions/runs/44514582670) pasó, incluido el paso de concurrencia PostgreSQL 17. #22 incluye #20, #18 y #17. #18 y #20 tienen CI aprobado. #17 tiene conflictos con main y GitHub no devolvió una ejecución del workflow asociada a su punta. El ensayo de merge directo de la candidata inicial con main detectó 42 conflictos, incluidos reservas, autenticación, pagos y catálogo. El PR nuevo apunta a la rama de #22 para revisar las correcciones sin resolver esos conflictos por sustitución masiva. La reconciliación con main sigue siendo una puerta de publicación.

Las ramas #19 y #21 son hermanas y tienen CI aprobado. La candidata ya incluía la distinción de fila ausente y configuración corrupta de #19. Esta rama integra el manejo de excepciones de #21 en la ruta activa y reutiliza la validación estricta. #23 queda fuera del sprint. Los PR existentes siguen en borrador y abiertos.

## Correcciones y evidencia

| Cambio | Archivos | Evidencia |
|---|---|---|
| La reserva rechaza una consulta de lista negra fallida o una fila inválida antes de invocar la RPC de escritura | `app/api/public/reservas/route.ts`, `lib/reserva-lista-negra.mjs` | Pruebas de lista negra y HTTP con desconexión, error SQL simulado, valor inválido y coincidencia de teléfono |
| Reprogramación valida el tipo del cuerpo y el calendario antes de consultar la base. Sus errores públicos evitan exponer mensajes internos | `app/api/public/reservas/[id]/route.ts`, `lib/server/public-booking-validation.mjs` | Regresión de JSON null y fechas imposibles. La suite existente cubre tokens y reprogramación en SQL |
| Reserva pública diferencia caída de catálogo de comercio inexistente y ofrece reintento accesible en disponibilidad | `app/api/public/negocios/[slug]/route.ts`, `app/reservar/[slug]/page.tsx` | Build y lint. Falta una pasada de navegador del nuevo botón |
| Se restringe TRUNCATE en public y se aborta si hay grants efectivos por herencia o propiedad | `20261123000100_restrict_public_truncate.sql` | Fixture con grant directo y heredado comprueba aborto y preservación del UPDATE autorizado por columna |
| Se elimina la promesa cuantificada de disponibilidad del texto existente | `app/terminos/page.tsx` | Revisión de código. Texto, soporte y condiciones sujetos a revisión profesional |
| La rama nueva excluye despliegues Git de Vercel y CI prueba la API con el build local | `vercel.json`, `.github/workflows/ci.yml` | Build sintético sobre loopback. El test HTTP no invoca RPC de escritura |

Resultados ejecutados localmente para este cambio: **92/92** con npm test, ESLint, TypeScript y build aprobados, npm audit con cero avisos en el lockfile evaluado y **6/6** escenarios HTTP con un servidor PostgREST simulado. Las comprobaciones RLS y de integración SQL usan PGlite con identidades sintéticas. El PG17 nativo está configurado en Actions y pasó para el head de #22. Verificar el resultado para el head nuevo. No se usaron credenciales externas ni se enviaron comunicaciones.

La evidencia de navegador de #22 está en [docs/qa-release](qa-release/README.md). Incluye reserva a 320, 390, 768 y 1280 px y agenda como propietario sintético. Este sprint aporta HTTP contra Next compilado. Quedan pendientes E2E con Supabase Auth aislado, registro y primer servicio desde una cuenta nueva, recuperación de contraseña, revisión de teclado y lector de pantalla y revalidación móvil del recorrido completo.

## Matriz de lanzamiento

| Prioridad | Estado | Cierre |
|---|---|---|
| P0 código | Regresiones de reserva y reprogramación corregidas. La suite local cubre el acceso de dos comercios, tokens, bloqueo, solapamiento y alta atómica | Exigir CI del head y suite de integración en Preview aislado antes del piloto |
| P0 integración | #17 diverge de main | Resolver y revisar la base de integración sin perder cambios de main y volver a ejecutar todo el pipeline |
| P0 acceso al entorno | El dominio Vercel turnos-saas-eight.vercel.app corresponde a turnos-saas. Supabase reportó hwrlimcunbenxsvfbklr como ACTIVE_HEALTHY y akpwhsizquuhhlwincqs como INACTIVE. Falta confirmar el destino efectivo de la aplicación productiva y el aislamiento Preview | Verificar las referencias y destinos reales de URL y claves, callbacks, permisos y exclusión de credenciales externas antes de habilitar Preview |
| P0 datos | PostgreSQL 17 de recuperación pertenece al proceso separado. QA principal todavía no está autorizado para migrar | Cerrar recuperación y cotejo, revisar propietarios y grants y obtener autorizaciones separadas |
| P1 operación | Falta ensayo de alta, OAuth, restablecimiento de acceso y baja con datos sintéticos. Los avisos de seguridad de plataforma necesitan verificación de alcance | Completar recorrido y acordar soporte, retención, exportación, eliminación y condiciones comerciales |
| P1 opcional | Mercado Pago, Resend y recordatorios tienen código y controles locales. No hay sandbox extremo a extremo confirmado | Mantener sin credenciales activas en el piloto y ofrecer reserva sin seña automática en sus comercios |
| Poslanzamiento | Suscripción automática, reembolsos, recordatorios externos y predicciones requieren pruebas y decisiones adicionales | Activar por separado tras verificación y aprobación |

## Orden de base de datos propuesto

Sobre el esquema QA reconciliado con las once migraciones previas: `owner_operations` (operaciones y reglas), `owner_insights` (depende de operaciones), `atomic_onboarding` (requiere la base de negocio y roles) y `restrict_public_truncate` (revoca permisos de tabla amplios y comprueba acceso efectivo). Los timestamps remotos se cotejan con el contenido antes de aplicar. El último paso falla y revierte si hay concesiones heredadas o propietarios incompatibles. Verificar además inserts y updates administrativos y roles de plataforma con evidencia del catálogo. Cada intervención remota requiere su propia autorización.

## Checklist del piloto

- [ ] Resolver integración con main y validar CI del commit candidato, incluido PostgreSQL 17 nativo.
- [ ] Confirmar identidad y estado de los proyectos, recuperación de QA y esquema efectivo. Aprobar por separado las migraciones.
- [ ] Validar variables y callbacks exclusivos del Preview, hacer smoke test sin servicios externos y luego probar con dos comercios sintéticos.
- [ ] Recorrer alta, catálogo, agenda y enlace público en móvil, reprogramación y cancelación. Confirmar que una carrera persista sólo un turno.
- [ ] Confirmar modalidad comercial, privacidad, soporte, bajas y canal para solicitudes de datos. Mantener deshabilitados cobros y mensajes externos durante la validación.
- [ ] Aprobar publicación de forma expresa, registrar rollback compatible con el esquema y monitorear errores, conflictos y disponibilidad de turnos.

El MVP propuesto incluye alta de propietario y negocio, catálogo, staff, horarios y bloqueos, reservas como invitado con pago en el local, agenda diaria y semanal, cancelación y reprogramación mediante las reglas disponibles, clientes e informes existentes sujetos a validación. La operación comercial y la apertura de tráfico quedan condicionadas a los controles anteriores.
