# Turnly — ensayo de recuperación PostgreSQL 17 en GitHub Actions

**Estado: PREPARADO, NO EJECUTADO. Migraciones en QA: NO-GO.** Solo verificación local de integridad. Este workflow no restaura QA ni producción.

## Paquetes verificados

- Kit privado externo `Turnly_kit_recuperacion_QA_PG17.zip`: SHA-256 `96808016502a4ee502fbd3bea6c07b6130c74fbb2dbba016d8739cc272a7a42c`.
- ZIP original interno `Turnly_QA_20261119_161937.zip`: SHA-256 `76e709876f098a67da2c8fb946bbdfade6fadee36fc0c26727c14b2049191077`.
- Completadas en entorno de preparación: `sha256sum -c SHA256SUMS`, `python3 probar_controles.py` y `python3 ensayar.py --solo-archivo` (PASS, alcance **archivo**).
- **Pendiente**: ejecutar `python3 ensayar.py --imagen "$IMAGE"` para obtener `resultado=PASS`, `alcance=restauracion_pg17` y `restauracion=verificada`. El script comprueba 84 componentes, 64 relaciones, 303 registros, 2 turnos, 11 migraciones, 52 FK e índices.

## Seguridad

Este repositorio es **público**. Nunca subir los ZIP (ni cifrados), dumps, archivos Auth, logs SQL, informes crudos o datos personales al repositorio, PR o artifacts de Actions. El workflow solo publica PASS/FAIL resumido; las salidas completas son retenidas temporalmente dentro del runner y se intenta eliminarlas al finalizar. La infraestructura GitHub-hosted y el host del runner mantienen acceso potencial a datos descifrados, aunque el contenedor de base utiliza `--network none`. **Para mayor aislamiento, preferir un equipo propio o un repositorio separado privado.** No usar self-hosted runners permanentes en repositorios públicos.

El workflow no hace checkout del código, se ejecuta manualmente y carece de permisos de token para el repositorio. Las credenciales de QA/producción son innecesarias y NO se configuran.

## Configuración manual requerida

1. Agregar la **variable de repositorio** `TURNLY_QA_PG17_IMAGE_DIGEST`: imagen verificada por procedencia, de forma `supabase/postgres@sha256:<64 hex>`. Debe contener PostgreSQL 17 y versiones exactas `pg_graphql 1.5.11`, `supabase_vault 0.3.1`, `pg_stat_statements 1.11`, `pgcrypto 1.3`, `uuid-ossp 1.1`, `plpgsql 1.0`. El tag `17.6.1.136` es **candidato no probado**, no se debe asumir compatibilidad.
2. Crear copia **cifrada** del kit exterior en un equipo confiable sin alterar el original: `gpg --symmetric --cipher-algo AES256 --output kit.zip.gpg Turnly_kit_recuperacion_QA_PG17.zip`. Guardar la contraseña en lugar seguro. Subir exclusivamente el archivo cifrado a almacenamiento HTTPS privado con acceso temporal o restringido.
3. Configurar los **secrets** `TURNLY_QA_ENCRYPTED_PACKAGE_URL` (URL HTTPS privada para descargar el `.gpg`) y `TURNLY_QA_PACKAGE_PASSPHRASE` (contraseña GPG). No pegarlos en chats ni en archivos públicos. Una URL firmada es una credencial.
4. Revisar seguridad de Actions y permisos de quienes pueden editar workflows. Preferir approvals de environment antes de ejecutar: este workflow **no** tiene configurado un environment protegido.
5. Desde Actions -> `Turnly QA - PostgreSQL 17 restore (manual)` -> Run workflow, introducir `RESTORE-ISOLATED`. El job debe aparecer en verde con resumen sanitizado; un PASS de archivo no basta.

## Limitaciones / criterio de aceptación

El ejecutor desconecta la red del contenedor PostgreSQL, limita recursos e intenta eliminar contenedor y volúmenes. El runner de GitHub sí tiene conectividad, por lo que el riesgo de exposición residual no es nulo. No se publica informe de diferencias: si falla, inspeccionar reportes **solo en un entorno de confianza**, no imprimir los JSON ni SQL en Actions público.

La verificación es de **restauración lógica PostgreSQL** del alcance capturado; NO recupera claves criptográficas, OAuth, SMTP, funciones Edge, integración de pagos, configuración de Vercel ni prueba login real de Supabase. Es imprescindible una decisión posterior para autorizar migraciones `owner_operations`, `owner_insights` y `atomic_onboarding` en QA principal. NO se autorizan por instalar este workflow.

## Detalles que requieren comprobación real

El paquete tiene un ejecutor Python 3.9+ y necesita Linux Docker Engine y la imagen con binarios `postgres`, `pg_restore`, `psql`, `createdb`, `initdb` y `pg_ctl` v17, más extensiones compatibles. El job descarga una imagen por digest *antes* de descifrar el respaldo y el ejecutor exige que la imagen esté disponible localmente. La estructura, el SQL, los propietarios y los permisos se validan por el propio script; no se ha verificado su comportamiento contra PostgreSQL 17 en esta intervención.
