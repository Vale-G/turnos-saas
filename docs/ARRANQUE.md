# Estado de arranque — 30 de octubre de 2026

## Correcciones incluidas

- Next 14.2.35 ahora carga `next.config.mjs` en lugar del formato TS incompatible.
- ESLint vuelve a una configuración compatible con el script y las dependencias instaladas, con reglas Next/TypeScript activas.
- Se declararon y fijaron dependencias que ya importaban los componentes: Radix, DayPicker 8, CVA, clsx y tailwind-merge; se agregó Autoprefixer requerido por PostCSS.
- Se restituyó `cn`, se corrigió la importación de Footer y su prueba con el proveedor real de traducciones.
- Se corrigió el hook condicional de ThemeToggle y el matcher de días del calendario.
- El webhook usa runtime Node en lugar de la configuración bodyParser del Pages Router. No se cambió su lógica de cobro.
- `getRequestConfig` se importa del módulo servidor de next-intl.

## Resultado de validación

- Instalación desde npm completada.
- Jest: 2 suites y 3 pruebas aprobadas. No equivalen a una prueba integral de reservas o pagos.
- El build superó los errores iniciales de configuración y dependencias, pero NO aprueba: quedan errores de lint y TypeScript.
- No se desplegó, migró ni fusionó esta rama.

## Bloqueos de lanzamiento

1. Faltan implementaciones exportadas `crearPreferenciaMercadoPago` y `crearPreferenciaSena`; definir y probar el flujo de cobro antes de habilitarlo.
2. Tipos incompatibles en servicio de señas; relaciones de recordatorios tratadas como objeto cuando el cliente las tipa como arrays; llamada inválida a `t.raw` en LegalDoc.
3. Separar validación de Edge Functions Deno del proyecto Next y comprobar cada entorno.
4. Completar errores de lint sin ocultarlos ni desactivar comprobaciones de build.
5. Revisar el middleware (matcher con espacios, rutas de idioma sin estructura equivalente y cliente de cookies de servidor dentro de middleware), proveedor de traducciones y permisos de todas las rutas.
6. Verificar configuración Tailwind: el build informa content vacío o ausente.
7. Probar autorización y firma del webhook: existe `verifySignature` sin uso. No habilitar cobros sobre esta base sin pruebas.
8. Acceso a Vercel bloqueado por 403 para `team_Fi4MaxfUdV9WvylCvHBozSuJ`: requiere consentimiento del dueño en el enlace de autorización. No es necesario compartir secretos en el chat.
9. Verificar login, alta de negocio, disponibilidad, reserva, cancelación y aislamiento entre negocios con datos ficticios en un entorno de prueba antes de publicar.
