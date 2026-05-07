
-- Añadir columnas para la personalización de marca del plan PRO
ALTER TABLE public.negocio
ADD COLUMN IF NOT EXISTS banner_url TEXT,
ADD COLUMN IF NOT EXISTS mensaje_bienvenida TEXT;

-- Asegurarse de que las políticas de RLS cubren las nuevas columnas
-- (No se necesita una nueva política si la existente ya permite a los dueños modificar su propia fila)

-- Opcional: Crear un bucket de almacenamiento específico para banners si aún no existe
-- Esto se haría desde el dashboard de Supabase, pero lo documento aquí.
-- La política de acceso al bucket debe permitir la subida a usuarios autenticados
-- que son dueños del negocio correspondiente (usando la metadata del archivo).
/*
INSERT INTO storage.buckets (id, name, public)
VALUES ('banners', 'banners', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Los dueños pueden subir banners para su negocio"
ON storage.objects FOR INSERT
WITH CHECK ( bucket_id = 'banners' AND (storage.foldername(name))[1] = auth.uid() );
*/
