'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'

export default function SuperadminElite() {
  const [negocios, setNegocios] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return router.push('/login')

      // Verificar si es superadmin real
      const { data: admin } = await supabase.from('adminrol').select('role').eq('user_id', user.id).single()
      if (admin?.role !== 'superadmin') return router.push('/dashboard')

      const { data: negs } = await supabase.from('negocio').select('*, adminrol(user_id)').order('created_at', { ascending: false })
      setNegocios(negs || [])
      setLoading(false)
    }
    init()
  }, [router])

  const cambiarPlan = async (id: string, nuevoPlan: string) => {
    const { error } = await supabase.from('negocio').update({ suscripcion_tipo: nuevoPlan }).eq('id', id)
    if (error) toast.error('Error al cambiar plan')
    else {
      toast.success('Plan actualizado a ' + nuevoPlan.toUpperCase())
      setNegocios(negocios.map(n => n.id === id ? { ...n, suscripcion_tipo: nuevoPlan } : n))
    }
  }

  const borrarNegocio = async (id: string) => {
    const code = prompt('Para confirmar la ELIMINACIÓN TOTAL, escribí "BORRAR"')
    if (code !== 'BORRAR') return
    await supabase.from('negocio').delete().eq('id', id)
    setNegocios(negocios.filter(n => n.id !== id))
    toast.success('Negocio fulminado de la base de datos')
  }

  if (loading) return <div className="min-h-screen bg-[#020617] flex items-center justify-center font-black text-2xl text-rose-500 animate-pulse uppercase tracking-widest italic">SUPERADMIN LOGIN...</div>

  const activos = negocios.filter(n => n.suscripcion_tipo === 'pro').length
  const trials = negocios.filter(n => n.suscripcion_tipo === 'trial').length

  return (
    <div className="min-h-screen bg-[#020617] text-white p-6 md:p-12 font-sans selection:bg-rose-500/30">
      <div className="max-w-6xl mx-auto">
        <header className="mb-12 border-b border-rose-500/20 pb-8 flex justify-between items-end">
          <div>
            <p className="text-[10px] font-black uppercase text-rose-500 tracking-[0.4em] mb-2 shadow-rose-500">Nivel de Acceso: Dios</p>
            <h1 className="text-6xl font-black uppercase italic tracking-tighter">Super<span className="text-rose-500">Admin</span></h1>
          </div>
          <button onClick={() => router.push('/dashboard')} className="text-xs font-black uppercase bg-white/10 px-6 py-3 rounded-2xl hover:bg-white/20 transition-all">Ir a mi local</button>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="bg-rose-500/10 border border-rose-500/20 p-8 rounded-[3rem]">
            <p className="text-[10px] font-black uppercase tracking-widest text-rose-400 mb-2">Locales PRO (Pagando)</p>
            <p className="text-5xl font-black italic text-rose-500">{activos}</p>
          </div>
          <div className="bg-blue-500/10 border border-blue-500/20 p-8 rounded-[3rem]">
            <p className="text-[10px] font-black uppercase tracking-widest text-blue-400 mb-2">En Periodo Trial</p>
            <p className="text-5xl font-black italic text-blue-500">{trials}</p>
          </div>
          <div className="bg-white/5 border border-white/10 p-8 rounded-[3rem]">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Total Registrados</p>
            <p className="text-5xl font-black italic">{negocios.length}</p>
          </div>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-[3rem] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-black/40 border-b border-white/5 text-[10px] font-black uppercase tracking-widest text-slate-500">
                <tr>
                  <th className="p-6">Negocio</th>
                  <th className="p-6">Plan / Estado</th>
                  <th className="p-6">Link</th>
                  <th className="p-6 text-right">Acciones Peligrosas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {negocios.map(neg => (
                  <tr key={neg.id} className="hover:bg-white/5 transition-colors">
                    <td className="p-6">
                      <p className="font-black italic uppercase text-lg">{neg.nombre}</p>
                      <p className="text-[10px] text-slate-500">{neg.whatsapp || 'Sin WhatsApp'}</p>
                    </td>
                    <td className="p-6">
                      <select 
                        value={neg.suscripcion_tipo} 
                        onChange={(e) => cambiarPlan(neg.id, e.target.value)}
                        className={`text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg outline-none cursor-pointer border ${neg.suscripcion_tipo === 'pro' ? 'bg-amber-400/20 text-amber-400 border-amber-400/30' : neg.suscripcion_tipo === 'trial' ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' : 'bg-white/10 text-slate-300 border-transparent'}`}
                      >
                        <option value="normal" className="bg-black">NORMAL</option>
                        <option value="trial" className="bg-black">TRIAL 14D</option>
                        <option value="pro" className="bg-black">PRO PREMIUM</option>
                      </select>
                    </td>
                    <td className="p-6 text-xs text-slate-400">/{neg.slug}</td>
                    <td className="p-6 text-right">
                      <button onClick={() => borrarNegocio(neg.id)} className="bg-rose-500/10 text-rose-500 border border-rose-500/20 px-4 py-2 rounded-xl text-[10px] font-black uppercase hover:bg-rose-500 hover:text-white transition-all">
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
