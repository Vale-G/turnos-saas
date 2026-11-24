# Checklist del cierre de Turnly

## Local

| Control | Estado | Evidencia |
| --- | --- | --- |
| Base del PR #28 | PASS | 208 blobs cotejados en copia privada |
| Integridad del kit y controles negativos | PASS | Dos ZIP y 84 huellas |
| Restauración PG17 nueva | BLOCKED | Socket de Docker y no-new-privileges |
| Equivalencia de catálogo y ACL | FAIL | Último ensayo con ocho componentes discrepantes |
| RLS y permisos efectivos sobre copia real | NOT TESTED | Restauración no disponible |
| Inventario legado y migraciones sobre copia recuperada | BLOCKED | Requieren base restaurada |
| npm ci | FAIL | Caché incompleta y registro sin DNS |
| ESLint, TypeScript y build | BLOCKED | Binarios de dependencias ausentes |
| npm test | FAIL | No se pudo cargar PGlite |
| npm audit | BLOCKED | Registro sin DNS |
| Ejecutor de facturación | PASS | Tres pruebas con transporte simulado |
| Operación E2E y accesibilidad | NOT TESTED | Sin build ni Auth local aislado |

## Externo

| Control | Estado | Evidencia |
| --- | --- | --- |
| Estado PR #25–#28 | PASS | Borradores abiertos con cadena de commits verificada |
| CI base #28 | PASS | Ejecución 45121987291. Alcance sintético y smoke |
| Snapshot vigente para QA | FAIL | Cinco componentes discrepantes al 24/11 |
| Aislamiento Preview | BLOCKED | Configuración compartida y referencias opacas sin verificar |
| Flujo Mercado Pago real de prueba | NOT TESTED | Sin credenciales Sandbox verificadas |
| Scheduler gestionado | NOT TESTED | Cliente preparado. Pendiente ensayo end-to-end |
| Precios y textos legales | BLOCKED | Aprobaciones pendientes |
| Lanzamiento comercial | BLOCKED | Recuperación, validaciones y autorizaciones abiertas |
