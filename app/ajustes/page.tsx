
'use client'

import { supabase } from '@/lib/supabase'
import { getThemeColor } from '@/lib/theme'
import { INegocio } from '@/lib/types'
import { User } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useCallback } from 'react'
import { toast } from 'sonner'

export default function AjustesPage() {
  // --- ESTADOS TIPADOS ---
  const [user, setUser] = useState<User | null>(null)
  const [negocio, setNegocio] = useState<INegocio | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)

  const router = useRouter()
  const colorP = getThemeColor(negocio?.tema)

  const fetchNegocio = useCallback(async (userId: string) => {
    let { data: foundNegocio } = await supabase
        .from('negocio')
        .select('*')
        .eq('owner_id', userId)
        .single<INegocio>()

    if (!foundNegocio) {
        // ... (lógica para adminrol sin cambios)
    }
    
    setNegocio(foundNegocio)
    setLoading(false)
  }, [])

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.push('/login')
        return
      }
      setUser(user)
      fetchNegocio(user.id)
    })
  }, [router, fetchNegocio])

  const handleSave = async () => {
    if (!negocio) return;
    setSaving(true)
    const { error } = await supabase
      .from('negocio')
      .update({
        nombre: negocio.nombre,
        slug: negocio.slug,
        tema: negocio.tema,
        hora_apertura: negocio.hora_apertura,
        hora_cierre: negocio.hora_cierre,
        dias_laborales: negocio.dias_laborales,
        banner_url: negocio.banner_url,
        mensaje_bienvenida: negocio.mensaje_bienvenida
      })
      .eq('id', negocio.id)

    setSaving(false)
    if (error) {
      toast.error('Error al guardar los ajustes. Verifica que el SLUG no esté repetido.')
      return
    }
    toast.success('Ajustes guardados con éxito')
  }

  // ... (el resto del componente permanece funcionalmente igual pero ahora se beneficia del tipado)
}
