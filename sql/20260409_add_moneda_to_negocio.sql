-- Multi-moneda para Turnly (compatibilidad con tablas `negocios` y `negocio`)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'negocios'
  ) THEN
    ALTER TABLE public.negocios
      ADD COLUMN IF NOT EXISTS moneda text NOT NULL DEFAULT 'ARS';

    IF NOT EXISTS (
      SELECT 1
      FROM pg_constraint
      WHERE conname = 'negocios_moneda_iso4217_chk'
    ) THEN
      ALTER TABLE public.negocios
        ADD CONSTRAINT negocios_moneda_iso4217_chk
        CHECK (moneda ~ '^[A-Z]{3}$');
    END IF;
  ELSIF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'negocio'
  ) THEN
    ALTER TABLE public.negocio
      ADD COLUMN IF NOT EXISTS moneda text NOT NULL DEFAULT 'ARS';

    IF NOT EXISTS (
      SELECT 1
      FROM pg_constraint
      WHERE conname = 'negocio_moneda_iso4217_chk'
    ) THEN
      ALTER TABLE public.negocio
        ADD CONSTRAINT negocio_moneda_iso4217_chk
        CHECK (moneda ~ '^[A-Z]{3}$');
    END IF;
  ELSE
    RAISE EXCEPTION 'No existe tabla public.negocios ni public.negocio';
  END IF;
END $$;
