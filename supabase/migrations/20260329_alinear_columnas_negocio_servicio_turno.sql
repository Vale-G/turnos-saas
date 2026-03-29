-- Alinear columnas requeridas por la app (idempotente)
DO $$
DECLARE
  negocio_tbl text;
  servicio_tbl text;
  turno_tbl text;
BEGIN
  negocio_tbl := COALESCE(to_regclass('"Negocio"')::text, to_regclass('negocio')::text);
  servicio_tbl := COALESCE(to_regclass('"Servicio"')::text, to_regclass('servicio')::text);
  turno_tbl := COALESCE(to_regclass('"Turno"')::text, to_regclass('turno')::text);

  IF negocio_tbl IS NOT NULL THEN
    EXECUTE format('ALTER TABLE %s ADD COLUMN IF NOT EXISTS onboarding_completo boolean', negocio_tbl);
    EXECUTE format('ALTER TABLE %s ADD COLUMN IF NOT EXISTS whatsapp text', negocio_tbl);
    EXECUTE format('ALTER TABLE %s ADD COLUMN IF NOT EXISTS tema text', negocio_tbl);
    EXECUTE format('ALTER TABLE %s ADD COLUMN IF NOT EXISTS hora_apertura time', negocio_tbl);
    EXECUTE format('ALTER TABLE %s ADD COLUMN IF NOT EXISTS hora_cierre time', negocio_tbl);
    EXECUTE format('ALTER TABLE %s ADD COLUMN IF NOT EXISTS dias_laborales smallint[]', negocio_tbl);
  END IF;

  IF servicio_tbl IS NOT NULL THEN
    -- Migrar duracion_minutos -> duracion si hace falta
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = REPLACE(servicio_tbl, '"', '')
        AND column_name = 'duracion_minutos'
    )
    AND NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = REPLACE(servicio_tbl, '"', '')
        AND column_name = 'duracion'
    ) THEN
      EXECUTE format('ALTER TABLE %s RENAME COLUMN duracion_minutos TO duracion', servicio_tbl);
    END IF;

    EXECUTE format('ALTER TABLE %s ADD COLUMN IF NOT EXISTS duracion integer', servicio_tbl);
  END IF;

  IF turno_tbl IS NOT NULL THEN
    EXECUTE format('ALTER TABLE %s ADD COLUMN IF NOT EXISTS fecha date', turno_tbl);
    EXECUTE format('ALTER TABLE %s ADD COLUMN IF NOT EXISTS hora time', turno_tbl);
    EXECUTE format('ALTER TABLE %s ADD COLUMN IF NOT EXISTS pago_estado text', turno_tbl);
    EXECUTE format('ALTER TABLE %s ADD COLUMN IF NOT EXISTS pago_tipo text', turno_tbl);
    EXECUTE format('ALTER TABLE %s ADD COLUMN IF NOT EXISTS pago_id text', turno_tbl);
    EXECUTE format('ALTER TABLE %s ADD COLUMN IF NOT EXISTS sena_pagada boolean', turno_tbl);
    EXECUTE format('ALTER TABLE %s ADD COLUMN IF NOT EXISTS mp_preference_id text', turno_tbl);
    EXECUTE format('ALTER TABLE %s ADD COLUMN IF NOT EXISTS requiere_sena boolean', turno_tbl);
    EXECUTE format('ALTER TABLE %s ADD COLUMN IF NOT EXISTS monto_sena numeric', turno_tbl);
  END IF;
END
$$;
