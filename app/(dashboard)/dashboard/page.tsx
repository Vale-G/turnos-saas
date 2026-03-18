'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

const TEMAS: any = {
  emerald: '#10b981',
  rose: '#f43f5e',
  blue: '#3b82f6',
  amber: '#f59e0b',
}

export default function DashboardPrincipal() {
  const [negocio, setNegocio] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    async function cargarDatos() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data } = await supabase
        .from('Negocio')
        .select('*')
        .eq('id', user.id)
        .single()

      if (data) setNegocio(data)
      setLoading(false)
    }
    cargarDatos()
  }, [router])

  if (loading) return <div className="min-h-screen bg-black text-white flex items-center justify-center font-black uppercase italic">Cargando...</div>

  const colorPrincipal = TEMAS[negocio?.tema || 'emerald']

  return (
    <div className="min-h-screen bg-[#020617] text-white p-8">
      <div className="max-w-6xl mx-auto">
        
        {/* Header con Logo y Nombre */}
        <header className="flex justify-between items-end mb-12 border-b border-white/5 pb-8">
          <div className="flex items-center gap-6">
            {negocio?.logo_url ? (
              <img src={negocio.logo_url} alt="Logo" className="w-20 h-20 object-contain rounded-2xl bg-white/5 p-2 border border-white/10" />
            ) : (
              <div className="w-20 h-20 bg-white/5 rounded-2xl border border-dashed border-white/20 flex items-center justify-center text-[10px] text-slate-500 uppercase font-black text-center p-2">Sin Logo</div>
            )}
            <div>
              <h1 className="text-5xl font-black uppercase italic tracking-tighter" style={{ color: colorPrincipal }}>
                {negocio?.nombre}
              </h1>
              <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] mt-1">
                Panel de Administración • <span className="text-white">{negocio?.suscripcion_tipo}</span>
              </p>
            </div>
          </div>
          <button 
            onClick={() => supabase.auth.signOut().then(() => router.push('/login'))}
            className="text-[10px] font-black uppercase text-slate-600 hover:text-red-500 transition-colors mb-2"
          >
            Cerrar Sesión
          </button>
        </header>

        {/* Rejilla de Opciones */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          
          <div onClick={() => router.push('/turnos')} className="bg-slate-900/40 p-8 rounded-[2.5rem] border border-white/5 hover:border-white/20 transition-all cursor-pointer group">
            <h3 className="text-2xl font-black italic uppercase mb-1" style={{ color: colorPrincipal }}>Agenda</h3>
            <p className="text-slate-500 text-xs font-bold">Gestiona tus citas.</p>
          </div>

          <div onClick={() => router.push('/servicios')} className="bg-slate-900/40 p-8 rounded-[2.5rem] border border-white/5 hover:border-white/20 transition-all cursor-pointer group">
            <h3 className="text-2xl font-black italic uppercase mb-1" style={{ color: colorPrincipal }}>Servicios</h3>
            <p className="text-slate-500 text-xs font-bold">Precios y tiempos.</p>
          </div>

          <div onClick={() => router.push('/staff')} className="bg-slate-900/40 p-8 rounded-[2.5rem] border border-white/5 hover:border-white/20 transition-all cursor-pointer group">
            <h3 className="text-2xl font-black italic uppercase mb-1" style={{ color: colorPrincipal }}>Staff</h3>
            <p className="text-slate-500 text-xs font-bold">Tus profesionales.</p>
          </div>

          <div onClick={() => router.push('/ajustes')} className="bg-slate-900/40 p-8 rounded-[2.5rem] border border-white/5 hover:border-white/20 transition-all cursor-pointer group">
            <h3 className="text-2xl font-black italic uppercase mb-1" style={{ color: colorPrincipal }}>Ajustes</h3>
            <p className="text-slate-500 text-xs font-bold">Marca y estilo.</p>
          </div>

        </div>

        {/* Link Público (Adelanto de lo que viene) */}
        <div className="mt-12 p-8 bg-emerald-500/5 rounded-[3rem] border border-emerald-500/10 flex flex-col md:flex-row justify-between items-center gap-6">
            <div>
                <h4 className="text-lg font-black uppercase italic tracking-tight">Tu Link de Reservas</h4>
                <p className="text-slate-500 text-sm">Copia este link y ponelo en tu Instagram para que los clientes reserven.</p>
            </div>
            <div className="bg-black/50 px-6 py-4 rounded-2xl border border-white/10 font-mono text-emerald-500 text-sm">
                barbucho.app/{negocio?.slug}
            </div>
        </div>
      </div>
    </div>
  )
}