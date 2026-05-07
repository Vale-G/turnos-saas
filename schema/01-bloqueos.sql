CREATE TABLE IF NOT EXISTS horarios_bloqueados (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    negocio_id UUID REFERENCES negocio(id) ON DELETE CASCADE,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    motivo TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_horarios_bloqueados_negocio_id ON horarios_bloqueados(negocio_id);
CREATE INDEX IF NOT EXISTS idx_horarios_bloqueados_range ON horarios_bloqueados(start_time, end_time);

-- RLS Policies
ALTER TABLE horarios_bloqueados ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Los dueños pueden gestionar sus propios bloqueos" 
ON horarios_bloqueados 
FOR ALL 
USING ( (SELECT is_owner_or_admin(negocio_id)) );

CREATE POLICY "Los bloqueos son visibles para todos (para la página de reservas)"
ON horarios_bloqueados
FOR SELECT
USING ( true );
