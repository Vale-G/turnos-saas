'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { getThemeColor } from '@/lib/theme'
import { toast } from 'sonner'

export default function InformesElite() {
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const [colorP, setColorP] = useState('#10b981')

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return router.push('/login')
      
      const { data: adm } = await supabase.from('adminrol').select('*').eq('user_id', user.id).single()
      let negId = adm?.negocio_id
      
      if (!negId && adm?.role !== 'superadmin') {
         const { data: n } = await supabase.from('negocio').select('id').eq('owner_id', user.id).single()
         if (n) negId = n.id
      }

      if (negId) {
        const { data: neg } = await supabase.from('negocio').select('tema, suscripcion_tipo').eq('id', negId).single()
        if (neg) {
          setColorP(getThemeColor(neg.tema))
          // BLINDAJE PRO: Si es plan normal y no es superadmin, lo pateamos
          if (neg.suscripcion_tipo === 'normal' && adm?.role !== 'superadmin') {
            toast.error('Los informes son exclusivos del plan PRO')
            return router.push('/dashboard')
          }
        }
      }
      setLoading(false)
    }
    init()
  }, [router])

  if (loading) return <div className="min-h-screen bg-[#020617] flex items-center justify-center font-black animate-pulse text-white uppercase tracking-widest text-2xl">CARGANDO MÉTRICAS...</div>

  return (
    <div className="min-h-screen bg-[#020617] text-white p-6 md:p-12">
      <div className="max-w-5xl mx-auto text-center py-20">
        <button onClick={() => router.push('/dashboard')} className="text-slate-500 text-[10px] font-black uppercase tracking-[0.4em] mb-12 hover:text-white transition-colors">← Volver al Dashboard</button>
        <div className="w-24 h-24 mx-auto rounded-[2rem] flex items-center justify-center text-4xl mb-8 border border-white/10 shadow-2xl" style={{ backgroundColor: colorP + '20', color: colorP }}>📊</div>
        <h1 className="text-5xl font-black uppercase italic tracking-tighter mb-4">Informes <span style={{color: colorP}}>PRO</span></h1>
        <p className="text-slate-400 text-sm max-w-lg mx-auto">Métricas avanzadas, ticket promedio y rendimiento por staff próximamente en este módulo.</p>
      </div>
    </div>
  )
}
