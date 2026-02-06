'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function Home() {
  const [negocios, setNegocios] = useState<any[]>([])
  const [negocioActual, setNegocioActual] = useState<any>(null)
  const [rol, setRol] = useState<'superadmin' | 'admin' | 'peluquero' | 'cliente'>('superadmin')
  const [filtroFecha, setFiltroFecha] = useState(new Date().toISOString().split('T')[0])
  const [nuevoNegocioNombre, setNuevoNegocioNombre] = useState('')

  const cargarDatosMaestros = async () => {
    // Consulta limpia sin la columna 'activo' que daba error
    const { data, error } = await supabase.from('Negocio').select(`
        id, 
        nombre, 
        plan,
        Servicio (id, nombre, precio, duracion_minutos), 
        turnos (id, nombre_cliente, hora_inicio, estado, Servicio (nombre, precio, duracion_minutos))
      `)

    if (error) {
      console.error("Error de Supabase:", error.message)
      return
    }

    if (data && data.length > 0) {
      setNegocios(data)
      // Evitamos el error de TypeScript usando una lógica simple
      setNegocioActual(data[0])
    }
  }

  useEffect(() => { cargarDatosMaestros() }, [])

  const handleCrearNegocio = async (e: any) => {
    e.preventDefault()
    if (!nuevoNegocioNombre) return
    const { error } = await supabase.from('Negocio').insert([{ nombre: nuevoNegocioNombre, plan: 'basico' }])
    if (!error) {
      setNuevoNegocioNombre('')
      await cargarDatosMaestros()
    }
  }

  const esPro = negocioActual?.plan === 'premium' || negocioActual?.plan === 'pro'
  const turnosHoy = negocioActual?.turnos?.filter((t: any) => t.hora_inicio.includes(filtroFecha)) || []
  const recaudacionReal = turnosHoy.filter((t: any) => t.estado === 'finalizado')
    .reduce((acc: number, t: any) => acc + (t.Servicio?.precio || 0), 0)

  if (!negocioActual) {
    return (
      <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center gap-4">
        <div className="w-12 h-12 border-4 border-[#10b981] border-t-transparent rounded-full animate-spin"></div>
        <div className="text-[#10b981] font-black uppercase tracking-[0.5em]">Iniciando Ecosistema...</div>
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-[#020617] text-slate-300 font-sans pb-24">
      <nav className="sticky top-0 z-50 backdrop-blur-xl bg-[#020617]/90 border-b border-[#10b981]/20 p-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <h1 className="text-xl font-black italic text-white uppercase tracking-tighter">Valentin <span className="text-[#10b981]">Platform</span></h1>
          <select 
            value={negocioActual.id} 
            onChange={(e) => setNegocioActual(negocios.find(n => n.id === e.target.value))}
            className="bg-[#0f172a] text-[#10b981] text-[10px] font-black px-4 py-2 rounded-xl border border-[#10b981]/20 outline-none uppercase"
          >
            {negocios.map(n => <option key={n.id} value={n.id}>{n.nombre}</option>)}
          </select>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto p-6 space-y-10">
        {/* DASHBOARD PRINCIPAL */}
        <header className="bg-[#0f172a] p-10 rounded-[3rem] border border-[#10b981]/10 flex justify-between items-end">
          <div>
            <p className="text-[10px] font-black text-[#10b981] uppercase tracking-[0.4em] mb-2">Entorno de Trabajo</p>
            <h2 className="text-5xl font-black text-white italic uppercase tracking-tighter">{negocioActual.nombre}</h2>
            <span className="inline-block mt-4 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-slate-800 text-slate-400">
              Plan {negocioActual.plan}
            </span>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Recaudación Hoy</p>
            <p className="text-4xl font-black text-white italic">${recaudacionReal}</p>
          </div>
        </header>

        {/* LISTADO DE TURNOS */}
        <section className="bg-[#0f172a]/20 p-8 rounded-[3rem] border border-white/5">
          <h3 className="text-xl font-black uppercase italic text-white mb-6">Agenda de Turnos</h3>
          <div className="space-y-4">
            {turnosHoy.length > 0 ? turnosHoy.map((t: any) => (
              <div key={t.id} className="p-6 rounded-[2rem] border border-white/5 bg-[#0f172a] flex justify-between items-center">
                <div>
                  <p className="font-black text-xl text-white italic uppercase">{t.nombre_cliente}</p>
                  <p className="text-[9px] font-bold text-[#10b981] uppercase">{t.Servicio?.nombre} — {t.estado}</p>
                </div>
                <div className="text-white font-bold">{new Date(t.hora_inicio).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
              </div>
            )) : <p className="text-center text-slate-500 py-10">No hay turnos para esta fecha.</p>}
          </div>
        </section>
      </div>
    </main>
  )
}