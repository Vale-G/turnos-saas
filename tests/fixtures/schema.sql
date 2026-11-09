-- Schema-only snapshot of relevant production columns/constraints; no rows, triggers or legacy policies.
-- TEST FIXTURE ONLY. Not an installation or production migration.
CREATE TABLE public.adminrol (
  user_id uuid NOT NULL,
  role text DEFAULT 'superadmin'::text NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  email text
);

CREATE TABLE public.bloquehorario (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  negocio_id uuid NOT NULL,
  recurrente boolean DEFAULT false NOT NULL,
  dia_semana smallint,
  fecha date,
  hora_inicio time without time zone NOT NULL,
  hora_fin time without time zone NOT NULL,
  motivo text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.bloqueo (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  negocio_id uuid,
  staff_id uuid,
  fecha date NOT NULL,
  hora_inicio time without time zone NOT NULL,
  hora_fin time without time zone NOT NULL,
  descripcion text,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.clientenota (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  negocio_id uuid NOT NULL,
  cliente_id uuid NOT NULL,
  cliente_nombre text,
  nota text,
  bloqueado boolean DEFAULT false NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.config (
  clave text NOT NULL,
  valor text NOT NULL,
  descripcion text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.gasto (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  negocio_id uuid,
  fecha date DEFAULT CURRENT_DATE NOT NULL,
  concepto text NOT NULL,
  monto numeric NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.negocio (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  owner_id uuid NOT NULL,
  nombre text NOT NULL,
  slug text NOT NULL,
  descripcion text,
  logo_url text,
  whatsapp text,
  tema text DEFAULT 'emerald'::text,
  hora_apertura time without time zone,
  hora_cierre time without time zone,
  dias_laborales smallint[] DEFAULT ARRAY[1, 2, 3, 4, 5],
  activo boolean DEFAULT true NOT NULL,
  onboarding_completo boolean DEFAULT false NOT NULL,
  suscripcion_tipo text DEFAULT 'trial'::text NOT NULL,
  trial_hasta timestamp with time zone,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  mp_access_token text,
  email_contacto text,
  moneda text DEFAULT 'ARS'::text NOT NULL
);

CREATE TABLE public.mercadopago_connection (
  negocio_id uuid NOT NULL,
  access_token_encrypted text NOT NULL,
  refresh_token_encrypted text,
  token_expires_at timestamp with time zone NOT NULL,
  mp_user_id text NOT NULL,
  live_mode boolean DEFAULT false NOT NULL,
  connected_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.servicio (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  negocio_id uuid NOT NULL,
  nombre text NOT NULL,
  precio numeric(12,2) DEFAULT 0 NOT NULL,
  duracion integer DEFAULT 30 NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  "seña_tipo" text DEFAULT 'porcentaje'::text,
  "seña_valor" numeric DEFAULT 50,
  descripcion text
);

CREATE TABLE public.staff (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  negocio_id uuid NOT NULL,
  nombre text NOT NULL,
  avatar_url text,
  activo boolean DEFAULT true NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.suscripcion (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  negocio_id uuid NOT NULL,
  plan text NOT NULL,
  estado text DEFAULT 'pendiente'::text NOT NULL,
  monto numeric(12,2) DEFAULT 0 NOT NULL,
  mp_preference_id text,
  mp_payment_id text,
  fecha_pago timestamp with time zone,
  fecha_vencimiento timestamp with time zone,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.turno (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  negocio_id uuid NOT NULL,
  staff_id uuid,
  servicio_id uuid,
  cliente_id uuid,
  cliente_nombre text,
  cliente_telefono text,
  fecha date NOT NULL,
  hora time without time zone NOT NULL,
  estado text DEFAULT 'pendiente'::text NOT NULL,
  pago_estado text DEFAULT 'pendiente'::text,
  pago_tipo text,
  pago_id text,
  requiere_sena boolean DEFAULT false NOT NULL,
  monto_sena numeric(12,2),
  sena_pagada boolean DEFAULT false NOT NULL,
  mp_preference_id text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.webhook_event (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  provider text NOT NULL,
  event_key text NOT NULL,
  payload jsonb NOT NULL,
  received_at timestamp with time zone DEFAULT now() NOT NULL,
  processed_at timestamp with time zone
);
ALTER TABLE public.adminrol ADD CONSTRAINT adminrol_pkey PRIMARY KEY (user_id);
ALTER TABLE public.adminrol ADD CONSTRAINT adminrol_user_id_key UNIQUE (user_id);
ALTER TABLE public.bloquehorario ADD CONSTRAINT bloquehorario_pkey PRIMARY KEY (id);
ALTER TABLE public.bloqueo ADD CONSTRAINT bloqueo_pkey PRIMARY KEY (id);
ALTER TABLE public.clientenota ADD CONSTRAINT clientenota_negocio_id_cliente_id_key UNIQUE (negocio_id, cliente_id);
ALTER TABLE public.clientenota ADD CONSTRAINT clientenota_pkey PRIMARY KEY (id);
ALTER TABLE public.config ADD CONSTRAINT config_pkey PRIMARY KEY (clave);
ALTER TABLE public.gasto ADD CONSTRAINT gasto_pkey PRIMARY KEY (id);
ALTER TABLE public.mercadopago_connection ADD CONSTRAINT mercadopago_connection_pkey PRIMARY KEY (negocio_id);
ALTER TABLE public.negocio ADD CONSTRAINT negocio_moneda_iso4217_chk CHECK ((moneda ~ '^[A-Z]{3}$'::text));
ALTER TABLE public.negocio ADD CONSTRAINT negocio_pkey PRIMARY KEY (id);
ALTER TABLE public.negocio ADD CONSTRAINT negocio_slug_key UNIQUE (slug);
ALTER TABLE public.negocio ADD CONSTRAINT negocio_slug_unique UNIQUE (slug);
ALTER TABLE public.servicio ADD CONSTRAINT servicio_pkey PRIMARY KEY (id);
ALTER TABLE public.staff ADD CONSTRAINT staff_pkey PRIMARY KEY (id);
ALTER TABLE public.suscripcion ADD CONSTRAINT suscripcion_pkey PRIMARY KEY (id);
ALTER TABLE public.turno ADD CONSTRAINT turno_pkey PRIMARY KEY (id);
ALTER TABLE public.webhook_event ADD CONSTRAINT webhook_event_pkey PRIMARY KEY (id);
ALTER TABLE public.webhook_event ADD CONSTRAINT webhook_event_provider_event_key_unique UNIQUE (provider, event_key);

-- Foreign keys follow primary/unique keys so this metadata fixture can be replayed.
ALTER TABLE public.adminrol ADD CONSTRAINT adminrol_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.bloquehorario ADD CONSTRAINT bloquehorario_negocio_id_fkey FOREIGN KEY (negocio_id) REFERENCES negocio(id) ON DELETE CASCADE;
ALTER TABLE public.bloqueo ADD CONSTRAINT bloqueo_negocio_id_fkey FOREIGN KEY (negocio_id) REFERENCES negocio(id) ON DELETE CASCADE;
ALTER TABLE public.bloqueo ADD CONSTRAINT bloqueo_staff_id_fkey FOREIGN KEY (staff_id) REFERENCES staff(id) ON DELETE CASCADE;
ALTER TABLE public.clientenota ADD CONSTRAINT clientenota_negocio_id_fkey FOREIGN KEY (negocio_id) REFERENCES negocio(id) ON DELETE CASCADE;
ALTER TABLE public.gasto ADD CONSTRAINT gasto_negocio_id_fkey FOREIGN KEY (negocio_id) REFERENCES negocio(id) ON DELETE CASCADE;
ALTER TABLE public.mercadopago_connection ADD CONSTRAINT mercadopago_connection_negocio_id_fkey FOREIGN KEY (negocio_id) REFERENCES negocio(id) ON DELETE CASCADE;
ALTER TABLE public.negocio ADD CONSTRAINT negocio_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.servicio ADD CONSTRAINT servicio_negocio_id_fkey FOREIGN KEY (negocio_id) REFERENCES negocio(id) ON DELETE CASCADE;
ALTER TABLE public.staff ADD CONSTRAINT staff_negocio_id_fkey FOREIGN KEY (negocio_id) REFERENCES negocio(id) ON DELETE CASCADE;
ALTER TABLE public.suscripcion ADD CONSTRAINT suscripcion_negocio_id_fkey FOREIGN KEY (negocio_id) REFERENCES negocio(id) ON DELETE CASCADE;
ALTER TABLE public.turno ADD CONSTRAINT turno_cliente_id_fkey FOREIGN KEY (cliente_id) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.turno ADD CONSTRAINT turno_negocio_id_fkey FOREIGN KEY (negocio_id) REFERENCES negocio(id) ON DELETE CASCADE;
ALTER TABLE public.turno ADD CONSTRAINT turno_servicio_id_fkey FOREIGN KEY (servicio_id) REFERENCES servicio(id) ON DELETE SET NULL;
ALTER TABLE public.turno ADD CONSTRAINT turno_staff_id_fkey FOREIGN KEY (staff_id) REFERENCES staff(id) ON DELETE SET NULL;

