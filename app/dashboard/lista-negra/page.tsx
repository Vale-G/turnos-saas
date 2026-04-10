'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'

type Bloqueado = {
  id: string
  nombre: string | null
  email: string | null
  telefono: string | null
  motivo: string | null
  creado_en: string
}

export default function ListaNegraPage() {
  const router = useRouter()
  const [negocioId, setNegocioId] = useState<string | null>(null)
  const [items, setItems] = useState<Bloqueado[]>([])
  const [loading, setLoading] = useState(true)

  const cargar = async (nId: string) => {
    const { data } = await supabase
      .from('lista_negra')
      .select('id, nombre, email, telefono, motivo, creado_en')
      .eq('negocio_id', nId)
      .order('creado_en', { ascending: false })
    setItems((data as Bloqueado[]) ?? [])
    setLoading(false)
  }

  useEffect(() => {
    async function init() {
      const { data: auth } = await supabase.auth.getUser()
      const user = auth.user
      if (!user) {
        router.push('/login')
        return
      }

      let nId: string | null = null
      const { data: adm } = await supabase.from('adminrol').select('negocio_id').eq('user_id', user.id).maybeSingle()
      if (adm?.negocio_id) {
        nId = adm.negocio_id
      } else {
        const { data: neg } = await supabase
          .from('negocio')
          .select('id')
          .eq('owner_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single()
        nId = neg?.id ?? null
      }

      if (!nId) {
        router.push('/onboarding')
        return
      }

      setNegocioId(nId)
      await cargar(nId)
    }

    init()
  }, [router])

  const desbloquear = async (id: string) => {
    if (!negocioId) return
    const { error } = await supabase.from('lista_negra').delete().eq('id', id).eq('negocio_id', negocioId)
    if (error) {
      toast.error('No se pudo procesar la solicitud')
      return
    }
    toast.success('Cliente desbloqueado')
    await cargar(negocioId)
  }

  return (
    <div className="min-h-screen bg-[#020617] text-white p-6 md:p-10">
      <div className="mx-auto max-w-6xl">
        <h1 className="text-4xl font-black uppercase italic tracking-tight mb-2">Lista Negra</h1>
        <p className="text-slate-400 text-sm mb-8">Clientes bloqueados para nuevas reservas online.</p>

        <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/5">
          <table className="w-full text-sm">
            <thead className="bg-black/30 text-slate-300 uppercase text-[11px] tracking-widest">
              <tr>
                <th className="text-left px-4 py-3">Cliente</th>
                <th className="text-left px-4 py-3">Contacto</th>
                <th className="text-left px-4 py-3">Motivo</th>
                <th className="text-left px-4 py-3">Fecha</th>
                <th className="text-right px-4 py-3">Acción</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-500">Cargando...</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-500">No hay clientes bloqueados.</td></tr>
              ) : (
                items.map((item) => (
                  <tr key={item.id} className="border-t border-white/5">
                    <td className="px-4 py-3 font-semibold">{item.nombre || 'Cliente'}</td>
                    <td className="px-4 py-3 text-slate-300">{item.telefono || item.email || '-'}</td>
                    <td className="px-4 py-3 text-slate-400">{item.motivo || '-'}</td>
                    <td className="px-4 py-3 text-slate-400">{new Date(item.creado_en).toLocaleDateString('es-AR')}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => desbloquear(item.id)}
                        className="rounded-xl border border-emerald-500/40 px-3 py-2 text-[11px] font-black uppercase tracking-wider text-emerald-400 hover:bg-emerald-500 hover:text-black transition-colors"
                      >
                        Desbloquear
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
