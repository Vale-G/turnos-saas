#!/usr/bin/env python3
"""Capture Turnly QA with one PostgreSQL snapshot. Artifacts contain private data."""
import hashlib
import os
from pathlib import Path
import re
import subprocess
import sys
import tempfile

QA_HOST = "db.hwrlimcunbenxsvfbklr.supabase.co"
PSQL = ["psql", "-X", "-qAt", "-v", "ON_ERROR_STOP=1", "-w"]
INVENTORY = """
select jsonb_build_object(
  'captured_at', transaction_timestamp(), 'postgres_version', current_setting('server_version'),
  'migrations', (select jsonb_agg(to_jsonb(m) order by version) from supabase_migrations.schema_migrations m),
  'roles', (select jsonb_agg(to_jsonb(r) - 'rolpassword' - 'rolconfig' order by rolname) from pg_roles r),
  'memberships', (select jsonb_agg(to_jsonb(m) - 'roleid' - 'member' - 'grantor' ||
    jsonb_build_object('role', r.rolname, 'member', u.rolname, 'grantor', g.rolname, 'grantor_id', m.grantor)
    order by r.rolname, u.rolname, g.rolname)
    from pg_auth_members m join pg_roles r on r.oid=m.roleid join pg_roles u on u.oid=m.member
    left join pg_roles g on g.oid=m.grantor),
  'extensions', (select jsonb_agg(jsonb_build_object('name', extname, 'version', extversion,
    'schema', nspname) order by extname) from pg_extension join pg_namespace on pg_namespace.oid=extnamespace)
)::text;
"""


def verify_connection(output_root):
    if (os.environ.get("PGHOST") != QA_HOST or os.environ.get("PGDATABASE") != "postgres"
            or os.environ.get("PGPORT", "5432") != "5432"
            or os.environ.get("PGSSLMODE") != "verify-full"
            or any(os.environ.get(key) for key in ("PGSERVICE", "PGHOSTADDR", "PGOPTIONS"))):
        raise SystemExit("Se exige conexión directa a QA por TLS verify-full y base postgres.")
    if any((parent / ".git").exists() for parent in (output_root, *output_root.parents)):
        raise SystemExit("Elegí un directorio privado fuera de cualquier checkout Git.")
    version = subprocess.check_output(["pg_dump", "--version"], text=True)
    if not re.search(r"\b17[.]", version):
        raise SystemExit("Se requiere pg_dump 17.")


def capture(output):
    with subprocess.Popen(PSQL, stdin=subprocess.PIPE, stdout=subprocess.PIPE, text=True) as session:
        try:
            session.stdin.write("begin isolation level repeatable read read only;\nselect pg_export_snapshot();\n")
            session.stdin.flush()
            snapshot = session.stdout.readline().strip()
            if not re.fullmatch(r"[0-9A-Fa-f-]+", snapshot):
                raise RuntimeError("QA no devolvió un identificador de snapshot válido.")
            dump = output / "qa.dump"
            subprocess.run(["pg_dump", "-w", "--format=custom", "--snapshot", snapshot,
                            "--file", dump], check=True)
            with (output / "inventory.json").open("w") as inventory:
                subprocess.run(PSQL, text=True, stdout=inventory, check=True, input=(
                    "begin isolation level repeatable read read only;\n"
                    f"set transaction snapshot '{snapshot}';\n{INVENTORY}\ncommit;\n"
                ))
            session.communicate("commit;\n")
            if session.returncode:
                raise RuntimeError("No se pudo confirmar la captura.")
        finally:
            if session.poll() is None:
                session.terminate()
    with (output / "toc.txt").open("w") as toc:
        subprocess.run(["pg_restore", "--list", dump], stdout=toc, check=True)
    subprocess.run(["pg_restore", "--file=/dev/null", dump], check=True)
    with (output / "SHA256SUMS").open("w") as manifest:
        for path in sorted(output.iterdir()):
            if path.name != "SHA256SUMS":
                with path.open("rb") as file:
                    manifest.write(hashlib.file_digest(file, "sha256").hexdigest() + f"  {path.name}\n")


def main():
    if len(sys.argv) != 2:
        raise SystemExit("Uso: python3 scripts/backup-qa.py /ruta/privada")
    os.umask(0o077)
    root = Path(sys.argv[1]).expanduser().resolve(strict=True)
    verify_connection(root)
    with tempfile.TemporaryDirectory(prefix=".turnly-qa-incomplete-", dir=root) as temp:
        stage = Path(temp)
        candidate = stage / "capture"
        candidate.mkdir()
        capture(candidate)
        destination = root / stage.name.replace(".turnly-qa-incomplete-", "turnly-qa-")
        candidate.rename(destination)
    print(destination)


if __name__ == "__main__":
    main()
