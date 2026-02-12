'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function SuperAdminPage() {
  const [negocios, setNegocios] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from('Negocio').select('*, Servicio(count)').order('created_at', { ascending: false })
      setNegocios(data || [])
      setLoading(false)
    }
    load()
  }, [])

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-black text-white uppercase italic tracking-tighter">Consola de Mando</h1>
        <p className="text-slate-500">Control global de la plataforma.</p>
      </div>

      <div className="bg-slate-900 rounded-3xl border border-slate-800 overflow-hidden shadow-2xl">
        <table className="w-full text-left">
          <thead className="bg-slate-950 text-slate-500 text-[10px] uppercase font-black">
            <tr>
              <th className="p-6 tracking-widest">Negocio</th>
              <th className="p-6 tracking-widest">Plan / Slug</th>
              <th className="p-6 tracking-widest">Servicios</th>
              <th className="p-6 tracking-widest">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800 text-sm">
            {negocios.map(n => (
              <tr key={n.id} className="hover:bg-slate-800/30 transition-colors">
                <td className="p-6">
                  <div className="flex items-center gap-3">
                    {n.logo_url && <img src={n.logo_url} className="w-8 h-8 rounded-lg object-cover" />}
                    <span className="font-bold text-white">{n.nombre}</span>
                  </div>
                </td>
                <td className="p-6 text-slate-400 font-mono text-xs">/{n.slug} <br/> <span className="text-[10px] uppercase">{n.plan}</span></td>
                <td className="p-6 font-black text-emerald-500">{n.Servicio?.[0]?.count || 0}</td>
                <td className="p-6">
                  <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${n.estado_plan === 'activo' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                    {n.estado_plan}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
