'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function Home() {
  const [negocios, setNegocios] = useState<any[]>([])
  const [negocioActual, setNegocioActual] = useState<any>(null)
  const [rol, setRol] = useState<'superadmin' | 'admin' | 'peluquero' | 'cliente'>('superadmin')
  
  // States: Formularios
  const [nombre, setNombre] = useState('')
  const [servicioId, setServicioId] = useState('')
  const [fechaSeleccionada, setFechaSeleccionada] = useState('')
  const [filtroFecha, setFiltroFecha] = useState(new Date().toISOString().split('T')[0])
  const [nuevoNegocioNombre, setNuevoNegocioNombre] = useState('')

  const cargarDatosMaestros = async () => {
    // Eliminamos ", activo" de la consulta para evitar el error 400
      const { data, error } = await supabase.from('Negocio').select(`
      id, 
      nombre, 
      plan,
      Servicio (id, nombre, precio, duracion_minutos), 
      turnos (id, nombre_cliente, hora_inicio, estado, Servicio (nombre, precio, duracion_minutos))
    `)

    if (error) {
      console.error("Error de Supabase:", error.message);
      setNegocios([]);
      return;
    }

    if (data && data.length > 0) {
      setNegocios(data);
      // Mantenemos el negocio seleccionado o cargamos el primero por defecto
      setNegocioActual(data[0]);
    } else {
      setNegocios([]);
    }
  };

  useEffect(() => { cargarDatosMaestros() }, [])

  // --- FUNCIONES SUPERADMIN ---
  const handleCrearNegocio = async (e: any) => {
    e.preventDefault()
    if (!nuevoNegocioNombre) return
    const { error } = await supabase.from('Negocio').insert([{ nombre: nuevoNegocioNombre, plan: 'basico' }])
    if (!error) {
      setNuevoNegocioNombre('')
      await cargarDatosMaestros()
      alert("🚀 Nuevo local activado en la plataforma")
    }
  }

  const cambiarPlanNegocio = async (id: string, nuevoPlan: string) => {
    await supabase.from('Negocio').update({ plan: nuevoPlan }).eq('id', id)
    await cargarDatosMaestros()
  }

  // --- LÓGICA DE NEGOCIO ---
  const esPro = negocioActual?.plan === 'premium' || negocioActual?.plan === 'pro';
  const turnosHoy = negocioActual?.turnos?.filter((t: any) => t.hora_inicio.includes(filtroFecha)) || []
  const recaudacionReal = turnosHoy.filter((t: any) => t.estado === 'finalizado')
    .reduce((acc: number, t: any) => acc + (t.Servicio?.precio || 0), 0)

  // Pantalla de carga mejorada
  if (!negocioActual && negocios.length === 0) {
    return (
      <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center gap-4">
        <div className="w-12 h-12 border-4 border-[#10b981] border-t-transparent rounded-full animate-spin"></div>
        <div className="text-[#10b981] font-black uppercase tracking-[0.5em] animate-pulse">Cargando Ecosistema...</div>
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-[#020617] text-slate-300 font-sans pb-24 selection:bg-[#10b981]/30">
      
      {/* NAVBAR GLOBAL */}
      <nav className="sticky top-0 z-50 backdrop-blur-xl bg-[#020617]/90 border-b border-[#10b981]/20 p-4">
        <div className="max-w-7xl mx-auto flex flex-wrap justify-between items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#10b981] rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(16,185,129,0.4)]">
              <span className="text-[#020617] font-black text-2xl">V</span>
            </div>
            <div>
              <h1 className="text-xl font-black italic text-white uppercase tracking-tighter">Valentin <span className="text-[#10b981]">Platform</span></h1>
              <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">SaaS Management</p>
            </div>
          </div>
          
          <div className="flex gap-1 bg-[#0f172a] p-1 rounded-xl border border-white/5">
            {['superadmin', 'admin', 'peluquero', 'cliente'].map((r: any) => (
              <button key={r} onClick={() => setRol(r as any)} className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all ${rol === r ? 'bg-[#10b981] text-[#020617]' : 'text-slate-500'}`}>
                {r}
              </button>
            ))}
          </div>

          <select 
            value={negocioActual?.id || ''} 
            onChange={(e) => setNegocioActual(negocios.find(n => n.id === e.target.value))}
            className="bg-[#0f172a] text-[#10b981] text-[10px] font-black px-4 py-2 rounded-xl border border-[#10b981]/20 outline-none uppercase"
          >
            {negocios.map(n => <option key={n.id} value={n.id}>{n.nombre}</option>)}
          </select>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto p-6 space-y-10">
        
        {rol === 'superadmin' && (
          <section className="bg-gradient-to-br from-[#064e3b] to-[#020617] p-10 rounded-[3rem] border border-[#10b981]/30 shadow-2xl animate-in fade-in slide-in-from-top-4 duration-700">
            <h2 className="text-3xl font-black text-white italic uppercase tracking-tighter mb-8">Consola de Control <span className="text-[#10b981]">Global</span></h2>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
              <div className="space-y-4">
                <p className="text-[10px] font-black text-[#10b981] uppercase tracking-[0.3em]">Registrar Nuevo Local</p>
                <form onSubmit={handleCrearNegocio} className="flex gap-3">
                  <input type="text" placeholder="Nombre del local (Ej: Gym Rojas)" value={nuevoNegocioNombre} onChange={e => setNuevoNegocioNombre(e.target.value)} className="flex-1 p-4 bg-[#020617] rounded-2xl border border-white/10 outline-none focus:border-[#10b981]" />
                  <button className="bg-[#10b981] text-[#020617] px-8 rounded-2xl font-black uppercase text-xs hover:bg-white transition-all">Activar</button>
                </form>
              </div>

              <div className="space-y-4">
                <p className="text-[10px] font-black text-[#10b981] uppercase tracking-[0.3em]">Suscripciones Activas</p>
                <div className="bg-[#020617] rounded-2xl border border-white/5 divide-y divide-white/5 max-h-[200px] overflow-y-auto">
                  {negocios.map(n => (
                    <div key={n.id} className="p-4 flex justify-between items-center">
                      <span className="text-xs font-bold text-white uppercase">{n.nombre}</span>
                      <div className="flex gap-2">
                        <button onClick={() => cambiarPlanNegocio(n.id, 'basico')} className={`px-3 py-1 rounded-lg text-[8px] font-black ${n.plan === 'basico' ? 'bg-slate-700 text-white' : 'bg-[#0f172a] text-slate-500'}`}>BASICO</button>
                        <button onClick={() => cambiarPlanNegocio(n.id, 'premium')} className={`px-3 py-1 rounded-lg text-[8px] font-black ${n.plan === 'premium' ? 'bg-amber-500 text-black shadow-lg' : 'bg-[#0f172a] text-slate-500'}`}>PREMIUM</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          <section className="lg:col-span-8 space-y-8">
            <header className="bg-[#0f172a] p-10 rounded-[3rem] border border-[#10b981]/10 flex justify-between items-end relative overflow-hidden">
               <div className="relative z-10">
                 <p className="text-[10px] font-black text-[#10b981] uppercase tracking-[0.4em] mb-2">Entorno de Trabajo</p>
                 <h2 className="text-5xl font-black text-white italic uppercase tracking-tighter">{negocioActual?.nombre}</h2>
                 <span className={`inline-block mt-4 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${esPro ? 'bg-amber-500 text-black shadow-[0_0_15px_rgba(245,158,11,0.4)]' : 'bg-slate-800 text-slate-400'}`}>
                    Plan {negocioActual?.plan}
                 </span>
               </div>
               {rol !== 'cliente' && (
                 <div className="text-right relative z-10">
                   <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Caja Cobrada</p>
                   <p className="text-4xl font-black text-white italic">${recaudacionReal}</p>
                 </div>
               )}
               <div className="absolute right-[-10%] top-[-20%] w-64 h-64 bg-[#10b981]/5 rounded-full blur-[100px]"></div>
            </header>

            <div className="bg-[#0f172a]/20 p-8 rounded-[3rem] border border-white/5 space-y-4">
              <div className="flex justify-between items-center mb-6 px-4">
                <h3 className="text-xl font-black uppercase italic text-white tracking-tighter">Agenda Operativa</h3>
                <input type="date" value={filtroFecha} onChange={e => setFiltroFecha(e.target.value)} className="bg-[#020617] border border-[#10b981]/20 text-[#10b981] p-3 rounded-xl font-bold text-[10px] outline-none" />
              </div>
              
              {turnosHoy.map((t: any) => (
                <div key={t.id} className={`p-6 rounded-[2rem] border flex justify-between items-center transition-all ${t.estado === 'proceso' ? 'bg-[#10b981]/5 border-[#10b981]' : t.estado === 'finalizado' ? 'bg-white/5 border-transparent opacity-40' : 'bg-[#0f172a] border-white/5 hover:border-[#10b981]/30'}`}>
                  <div className="flex items-center gap-6">
                    <div className="w-14 h-14 bg-[#020617] rounded-2xl flex items-center justify-center border border-[#10b981]/20 font-black text-[#10b981] text-xs">
                      {new Date(t.hora_inicio).getHours()}:{new Date(t.hora_inicio).getMinutes().toString().padStart(2, '0')}
                    </div>
                    <div>
                      <p className="font-black text-xl text-white italic uppercase tracking-tighter">{rol === 'cliente' ? 'RESERVADO' : t.nombre_cliente}</p>
                      <p className="text-[9px] font-bold text-slate-500 uppercase tracking-[0.2em]">{t.Servicio?.nombre} — <span className="text-[#10b981]">{t.estado}</span></p>
                    </div>
                  </div>
                  {rol !== 'cliente' && (
                    <div className="flex gap-2">
                      {t.estado === 'pendiente' && <button onClick={() => supabase.from('turnos').update({ estado: 'proceso' }).eq('id', t.id).then(cargarDatosMaestros)} className="px-4 py-2 bg-[#10b981] text-[#020617] rounded-lg text-[8px] font-black uppercase">Atender</button>}
                      {t.estado === 'proceso' && <button onClick={() => supabase.from('turnos').update({ estado: 'finalizado' }).eq('id', t.id).then(cargarDatosMaestros)} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-[8px] font-black uppercase">Cobrar</button>}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>

          {/* COLUMNA RESERVA */}
          <section className="lg:col-span-4 bg-[#0f172a] p-10 rounded-[3rem] border border-[#10b981]/10 h-fit">
             <h3 className="text-xl font-black uppercase italic text-[#10b981] mb-8">Nueva Entrada</h3>
             <form onSubmit={async (e) => {
               e.preventDefault();
               await supabase.from('turnos').insert([{ negocio_id: negocioActual.id, nombre_cliente: nombre, servicio_id: servicioId, hora_inicio: new Date(fechaSeleccionada).toISOString() }]);
               setNombre(''); setServicioId(''); setFechaSeleccionada(''); await cargarDatosMaestros();
             }} className="space-y-4">
               <input type="text" placeholder="Nombre" value={nombre} onChange={e => setNombre(e.target.value)} className="w-full p-4 bg-[#020617] rounded-2xl border border-white/10 text-white outline-none focus:border-[#10b981]" required />
               <select value={servicioId} onChange={e => setServicioId(e.target.value)} className="w-full p-4 bg-[#020617] rounded-2xl border border-white/10 text-white outline-none focus:border-[#10b981]" required>
                 <option value="">Servicio...</option>
                 {/* Eliminamos el filtro .activo para que no se rompa */}
                 {negocioActual?.Servicio?.map((s: any) => (
                    <option key={s.id} value={s.id}>{s.nombre}</option>
                  ))}
               </select>
               <input type="datetime-local" value={fechaSeleccionada} onChange={e => setFechaSeleccionada(e.target.value)} className="w-full p-4 bg-[#020617] rounded-2xl border border-white/10 text-white outline-none focus:border-[#10b981]" required />
               <button className="w-full bg-[#10b981] text-[#020617] font-black py-5 rounded-2xl uppercase tracking-widest text-[10px] shadow-lg shadow-[#10b981]/10 hover:bg-white transition-all">
                 Confirmar
               </button>
             </form>
          </section>

        </div>
      </div>
    </main>
  )
}