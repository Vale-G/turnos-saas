'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function Home() {
  // --- CORE STATES ---
  const [negocios, setNegocios] = useState<any[]>([])
  const [negocioActual, setNegocioActual] = useState<any>(null)
  const [seccionActiva, setSeccionActiva] = useState<'agenda' | 'servicios' | 'staff' | 'clientes' | 'finanzas' | 'admin'>('agenda')
  const [rol, setRol] = useState<'superadmin' | 'admin' | 'peluquero' | 'cliente'>('superadmin')
  const [loading, setLoading] = useState(true)

  // --- FORM STATES ---
  const [fTurno, setFTurno] = useState({ cliente: '', servicio: '', staff: '', fecha: '' })
  const [fServicio, setFServicio] = useState({ nombre: '', precio: '', duracion: '' })
  const [fStaff, setFStaff] = useState({ nombre: '' })
  const [fNegocio, setFNegocio] = useState({ nombre: '' })
  const [filtroFecha, setFiltroFecha] = useState(new Date().toISOString().split('T')[0])
  const [msg, setMsg] = useState({ t: '', tipo: '' })

  const cargarDatos = async () => {
    setLoading(true)
    const { data } = await supabase.from('Negocio').select(`
        *,
        Servicio (*),
        Staff (*),
        turnos (*, Staff(nombre), Servicio(*))
      `)
    if (data) {
      setNegocios(data)
      setNegocioActual((p: any) => p ? data.find((n: any) => n.id === p.id) || data[0] : data[0])
    }
    setTimeout(() => setLoading(false), 600)
  }

  useEffect(() => { cargarDatos() }, [])

  const notify = (t: string, tipo: 'success' | 'error') => {
    setMsg({ t, tipo }); setTimeout(() => setMsg({ t: '', tipo: '' }), 4000)
  }

  // --- LÓGICA DE TURNOS & PREVENCIÓN DE CONFLICTOS ---
  const handleCrearTurno = async (e: any) => {
    e.preventDefault()
    const isoFecha = new Date(fTurno.fecha).toISOString()
    const conflicto = negocioActual.turnos?.find((t: any) => 
      t.staff_id === fTurno.staff && t.hora_inicio === isoFecha && t.estado !== 'finalizado'
    )
    if (conflicto) return notify('⚠️ El profesional ya tiene un turno a esa hora', 'error')

    const { error } = await supabase.from('turnos').insert([{
      negocio_id: negocioActual.id, nombre_cliente: fTurno.cliente,
      servicio_id: fTurno.servicio, staff_id: fTurno.staff,
      hora_inicio: isoFecha, estado: 'pendiente'
    }])
    if (!error) {
      setFTurno({ cliente: '', servicio: '', staff: '', fecha: '' })
      notify('🚀 Turno agendado con éxito', 'success'); cargarDatos()
    }
  }

  // --- LÓGICA DE GESTIÓN (ADMIN) ---
  const handleCrearServicio = async (e: any) => {
    e.preventDefault()
    const { error } = await supabase.from('Servicio').insert([{
      negocio_id: negocioActual.id, nombre: fServicio.nombre,
      precio: parseFloat(fServicio.precio), duracion_minutos: parseInt(fServicio.duracion)
    }])
    if (!error) { setFServicio({ nombre: '', precio: '', duracion: '' }); notify('✅ Servicio creado', 'success'); cargarDatos() }
  }

  const handleCrearStaff = async (e: any) => {
    e.preventDefault()
    const { error } = await supabase.from('Staff').insert([{ negocio_id: negocioActual.id, nombre: fStaff.nombre }])
    if (!error) { setFStaff({ nombre: '' }); notify('👤 Staff vinculado', 'success'); cargarDatos() }
  }

  const handleCrearNegocio = async (e: any) => {
    e.preventDefault()
    const { error } = await supabase.from('Negocio').insert([{ nombre: fNegocio.nombre, plan: 'basico' }])
    if (!error) { setFNegocio({ nombre: '' }); notify('🏢 Nuevo local activo', 'success'); cargarDatos() }
  }

  // --- BUSINESS INTELLIGENCE (ANALYTICS) ---
  const turnosHoy = negocioActual?.turnos?.filter((t: any) => t.hora_inicio.includes(filtroFecha)) || []
  const cajaHoy = turnosHoy.filter((t: any) => t.estado === 'finalizado').reduce((a: number, t: any) => a + (t.Servicio?.precio || 0), 0)
  
  const getTopClientes = () => {
    const m = new Map()
    negocioActual?.turnos?.forEach((t: any) => {
      const d = m.get(t.nombre_cliente) || { v: 0, s: 0 }
      d.v += 1; if (t.estado === 'finalizado') d.s += (t.Servicio?.precio || 0)
      m.set(t.nombre_cliente, d)
    })
    return Array.from(m.entries()).sort((a, b) => b[1].s - a[1].s).slice(0, 6)
  }

  if (loading) return (
    <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center gap-6">
      <div className="w-20 h-20 border-4 border-[#10b981]/10 border-t-[#10b981] rounded-full animate-spin"/>
      <div className="text-center">
        <h2 className="text-[#10b981] font-black text-2xl uppercase tracking-[0.4em] animate-pulse">Sincronizando Plataforma</h2>
        <p className="text-slate-500 text-[10px] font-bold uppercase mt-2 tracking-widest">Valentin Core Engine v5.0</p>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#020617] text-slate-300 flex font-sans selection:bg-[#10b981]/30">
      
      {/* SIDEBAR ELITE */}
      <aside className="w-80 border-r border-white/5 bg-[#020617] flex flex-col p-10 gap-10 sticky top-0 h-screen z-50 shadow-2xl">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-gradient-to-tr from-[#10b981] to-[#059669] rounded-2xl flex items-center justify-center text-black font-black text-3xl shadow-[0_0_30px_rgba(16,185,129,0.3)]">V</div>
          <h1 className="font-black italic text-white text-2xl tracking-tighter uppercase leading-none">Platform</h1>
        </div>

        <nav className="flex flex-col gap-2 flex-1 overflow-y-auto pr-2">
          {[
            { id: 'agenda', label: 'Agenda Diaria', icon: '🗓️', r: ['superadmin', 'admin', 'peluquero', 'cliente'] },
            { id: 'clientes', label: 'CRM Clientes', icon: '💎', r: ['superadmin', 'admin'] },
            { id: 'servicios', label: 'Catálogo Precios', icon: '✂️', r: ['superadmin', 'admin', 'cliente'] },
            { id: 'staff', label: 'Gestión Staff', icon: '👥', r: ['superadmin', 'admin'] },
            { id: 'finanzas', label: 'Caja & BI', icon: '💰', r: ['superadmin', 'admin'] },
            { id: 'admin', label: 'SaaS Master', icon: '⚡', r: ['superadmin'] },
          ].map((i) => i.r.includes(rol) && (
            <button key={i.id} onClick={() => setSeccionActiva(i.id as any)} className={`flex items-center gap-4 p-5 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest transition-all ${seccionActiva === i.id ? 'bg-[#10b981] text-black shadow-xl' : 'hover:bg-white/5 text-slate-500'}`}>
              <span className="text-xl">{i.icon}</span> {i.label}
            </button>
          ))}
        </nav>

        {msg.t && (
          <div className={`p-4 rounded-2xl text-[10px] font-black uppercase text-center animate-bounce ${msg.tipo === 'success' ? 'bg-[#10b981]/20 text-[#10b981]' : 'bg-red-500/20 text-red-500'}`}>{msg.t}</div>
        )}

        <div className="bg-[#0f172a] p-6 rounded-[2.5rem] border border-white/5">
          <p className="text-[8px] font-black text-slate-600 uppercase mb-4 text-center tracking-widest">Switch de Rol</p>
          <div className="grid grid-cols-2 gap-2">
            {['admin', 'peluquero', 'cliente', 'superadmin'].map(r => (
              <button key={r} onClick={() => { setRol(r as any); setSeccionActiva('agenda'); }} className={`py-2 rounded-xl text-[7px] font-black uppercase transition-all ${rol === r ? 'bg-white text-black shadow-lg' : 'text-slate-600'}`}>{r}</button>
            ))}
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 overflow-y-auto">
        <header className="p-12 border-b border-white/5 flex justify-between items-center bg-[#020617]/80 backdrop-blur-2xl sticky top-0 z-40">
          <div>
            <h2 className="text-5xl font-black text-white italic uppercase tracking-tighter leading-none">{negocioActual.nombre}</h2>
            <p className="text-[10px] text-[#10b981] font-black uppercase tracking-[0.3em] mt-3">{rol} session</p>
          </div>
          <select value={negocioActual.id} onChange={(e) => setNegocioActual(negocios.find(n => n.id === e.target.value))} className="bg-[#0f172a] border border-white/10 text-white text-[10px] font-black p-5 rounded-2xl outline-none cursor-pointer">
            {negocios.map(n => <option key={n.id} value={n.id}>{n.nombre}</option>)}
          </select>
        </header>

        <div className="p-12 max-w-7xl mx-auto space-y-16 animate-in fade-in duration-700">
          
          {/* SECCIÓN AGENDA */}
          {seccionActiva === 'agenda' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
              <div className="lg:col-span-8 space-y-10">
                <div className="flex justify-between items-center border-b border-white/5 pb-8">
                  <h3 className="text-3xl font-black text-white uppercase italic tracking-tighter">Turnos <span className="text-[#10b981]">Activos</span></h3>
                  <input type="date" value={filtroFecha} onChange={e => setFiltroFecha(e.target.value)} className="bg-[#0f172a] border border-white/10 p-4 rounded-xl text-[#10b981] font-black text-xs outline-none focus:border-[#10b981]" />
                </div>
                <div className="space-y-6">
                  {turnosHoy.map((t: any) => (
                    <div key={t.id} className={`p-8 rounded-[3.5rem] border flex justify-between items-center group transition-all ${t.estado === 'proceso' ? 'bg-[#10b981]/10 border-[#10b981]' : 'bg-[#0f172a] border-white/5'}`}>
                      <div className="flex items-center gap-8">
                        <div className="w-20 h-20 bg-[#020617] rounded-[1.8rem] flex items-center justify-center border border-white/10 font-black text-2xl text-[#10b981]">
                          {new Date(t.hora_inicio).getHours()}:00
                        </div>
                        <div>
                          <p className="font-black text-white text-3xl uppercase italic tracking-tighter leading-none">{t.nombre_cliente}</p>
                          <p className="text-[10px] text-slate-500 font-bold uppercase mt-3 tracking-widest">{t.Servicio?.nombre} — <span className="text-white">{t.Staff?.nombre}</span></p>
                        </div>
                      </div>
                      {['admin', 'peluquero', 'superadmin'].includes(rol) && t.estado !== 'finalizado' && (
                        <button onClick={async () => {
                          const n = t.estado === 'pendiente' ? 'proceso' : 'finalizado'
                          await supabase.from('turnos').update({ estado: n }).eq('id', t.id); cargarDatos()
                        }} className="bg-white text-black px-10 py-4 rounded-[1.5rem] font-black text-[10px] uppercase hover:bg-[#10b981] transition-all">
                          {t.estado === 'pendiente' ? 'Iniciar' : 'Cobrar'}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="lg:col-span-4 space-y-8">
                {rol !== 'superadmin' && (
                  <section className="bg-gradient-to-br from-[#0f172a] to-[#020617] p-10 rounded-[3.5rem] border border-white/10 shadow-2xl">
                    <h4 className="text-white font-black uppercase italic mb-8 tracking-tighter text-xl text-center">Reserva Nueva</h4>
                    <form onSubmit={handleCrearTurno} className="space-y-5">
                      <input type="text" placeholder="Cliente" value={fTurno.cliente} onChange={e => setFTurno({...fTurno, cliente: e.target.value})} className="w-full bg-[#020617] border border-white/5 p-5 rounded-2xl text-xs text-white outline-none focus:border-[#10b981]" required />
                      <select value={fTurno.servicio} onChange={e => setFTurno({...fTurno, servicio: e.target.value})} className="w-full bg-[#020617] border border-white/5 p-5 rounded-2xl text-xs text-white outline-none" required>
                        <option value="">¿Servicio?</option>
                        {negocioActual.Servicio?.map((s: any) => <option key={s.id} value={s.id}>{s.nombre} (${s.precio})</option>)}
                      </select>
                      <select value={fTurno.staff} onChange={e => setFTurno({...fTurno, staff: e.target.value})} className="w-full bg-[#020617] border border-white/5 p-5 rounded-2xl text-xs text-white outline-none" required>
                        <option value="">¿Peluquero?</option>
                        {negocioActual.Staff?.filter((s:any)=>s.activo).map((s: any) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                      </select>
                      <input type="datetime-local" value={fTurno.fecha} onChange={e => setFTurno({...fTurno, fecha: e.target.value})} className="w-full bg-[#020617] border border-white/5 p-5 rounded-2xl text-xs text-white" required />
                      <button className="w-full bg-[#10b981] text-black font-black py-5 rounded-[2rem] uppercase text-[10px] tracking-widest shadow-xl shadow-[#10b981]/10 hover:bg-white transition-all">Confirmar Turno</button>
                    </form>
                  </section>
                )}
                {['admin', 'peluquero', 'superadmin'].includes(rol) && (
                  <div className="p-12 bg-[#10b981] rounded-[3.5rem] text-[#020617] shadow-2xl">
                    <p className="text-[11px] font-black uppercase tracking-widest opacity-60 italic">Ingresos Liquidados</p>
                    <p className="text-7xl font-black italic tracking-tighter my-4 leading-none">${cajaHoy}</p>
                    <p className="text-[9px] font-black uppercase opacity-60">Operaciones en tiempo real</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* SECCIÓN CLIENTES CRM */}
          {seccionActiva === 'clientes' && (
            <div className="space-y-12 animate-in fade-in slide-in-from-right-10">
              <h3 className="text-5xl font-black text-white italic uppercase tracking-tighter">Fidelización <span className="text-[#10b981]">CRM</span></h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {getTopClientes().map(([n, d]: any) => (
                  <div key={n} className="bg-[#0f172a] p-10 rounded-[4rem] border border-white/5 group hover:border-[#10b981]/50 transition-all">
                    <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center text-3xl mb-8">👤</div>
                    <p className="text-3xl font-black text-white uppercase italic tracking-tighter">{n}</p>
                    <div className="grid grid-cols-2 gap-6 mt-10 pt-8 border-t border-white/5">
                      <div>
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Visitas</p>
                        <p className="text-2xl font-black text-[#10b981] italic">{d.v}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Facturación</p>
                        <p className="text-2xl font-black text-white italic">${d.s}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SECCIÓN SERVICIOS */}
          {seccionActiva === 'servicios' && (
            <div className="space-y-12">
              <h3 className="text-5xl font-black text-white italic uppercase tracking-tighter">Gestión de <span className="text-[#10b981]">Catálogo</span></h3>
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-8">
                  {negocioActual.Servicio?.map((s: any) => (
                    <div key={s.id} className="bg-[#0f172a] p-12 rounded-[4rem] border border-white/5 group relative overflow-hidden">
                      <p className="text-white font-black uppercase italic text-3xl tracking-tighter">{s.nombre}</p>
                      <p className="text-[#10b981] font-black text-5xl mt-6 italic tracking-tighter">${s.precio}</p>
                      <div className="mt-10 pt-6 border-t border-white/5 flex justify-between items-center text-[10px] font-black uppercase text-slate-500">
                        <span>⏱️ {s.duracion_minutos} MINUTOS</span>
                        {rol === 'admin' && <button onClick={async () => { await supabase.from('Servicio').delete().eq('id', s.id); cargarDatos() }} className="text-red-500 hover:underline">Remover</button>}
                      </div>
                    </div>
                  ))}
                </div>
                {rol === 'admin' && (
                  <div className="lg:col-span-4 bg-[#020617] border border-[#10b981]/20 p-10 rounded-[3.5rem] shadow-2xl h-fit">
                    <h4 className="text-white font-black uppercase italic mb-8">Sumar Servicio</h4>
                    <form onSubmit={handleCrearServicio} className="space-y-4">
                      <input type="text" placeholder="Nombre" value={fServicio.nombre} onChange={e => setFServicio({...fServicio, nombre: e.target.value})} className="w-full bg-[#0f172a] border border-white/5 p-5 rounded-2xl text-xs text-white" required />
                      <input type="number" placeholder="Precio ($)" value={fServicio.precio} onChange={e => setFServicio({...fServicio, precio: e.target.value})} className="w-full bg-[#0f172a] border border-white/5 p-5 rounded-2xl text-xs text-white" required />
                      <input type="number" placeholder="Minutos" value={fServicio.duracion} onChange={e => setFServicio({...fServicio, duracion: e.target.value})} className="w-full bg-[#0f172a] border border-white/5 p-5 rounded-2xl text-xs text-white" required />
                      <button className="w-full bg-[#10b981] text-black font-black py-5 rounded-2xl uppercase text-[11px] tracking-widest shadow-xl">Publicar</button>
                    </form>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* SECCIÓN STAFF */}
          {seccionActiva === 'staff' && (
            <div className="space-y-12">
              <h3 className="text-5xl font-black text-white italic uppercase tracking-tighter">Mi <span className="text-[#10b981]">Equipo</span></h3>
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-3 gap-8">
                  {negocioActual.Staff?.map((s: any) => (
                    <div key={s.id} className="bg-[#0f172a] p-12 rounded-[4rem] border border-white/5 text-center group transition-all">
                      <div className="w-24 h-24 bg-gradient-to-br from-[#10b981]/20 to-transparent rounded-full flex items-center justify-center text-4xl mx-auto mb-8 shadow-2xl group-hover:scale-110 transition-transform">👤</div>
                      <p className="text-white font-black uppercase italic text-2xl tracking-tighter">{s.nombre}</p>
                      <p className="text-[10px] text-[#10b981] font-black uppercase mt-4 tracking-widest">{s.activo ? 'Operativo' : 'Inactivo'}</p>
                    </div>
                  ))}
                </div>
                {rol === 'admin' && (
                  <div className="lg:col-span-4 bg-[#020617] border border-[#10b981]/20 p-10 rounded-[3.5rem] h-fit shadow-2xl">
                    <h4 className="text-white font-black uppercase italic mb-8">Vincular Staff</h4>
                    <form onSubmit={handleCrearStaff} className="space-y-4">
                      <input type="text" placeholder="Nombre completo" value={fStaff.nombre} onChange={e => setFStaff({nombre: e.target.value})} className="w-full bg-[#0f172a] border border-white/5 p-5 rounded-2xl text-xs text-white" required />
                      <button className="w-full bg-[#10b981] text-black font-black py-5 rounded-2xl uppercase text-[11px]">Activar</button>
                    </form>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* SECCIÓN FINANZAS BI */}
          {seccionActiva === 'finanzas' && (
            <div className="space-y-12 animate-in zoom-in-95 duration-1000">
              <h3 className="text-5xl font-black text-white italic uppercase tracking-tighter">Control <span className="text-[#10b981]">Financiero</span></h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="bg-[#0f172a] p-12 rounded-[4rem] border border-white/5 shadow-xl">
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Ingresos Brutos</p>
                  <p className="text-6xl font-black text-white italic tracking-tighter">${cajaHoy}</p>
                  <p className="text-[10px] text-[#10b981] font-black uppercase mt-6 tracking-widest">Liquidación del día</p>
                </div>
                <div className="bg-[#0f172a] p-12 rounded-[4rem] border border-white/5 shadow-xl">
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Ticket Promedio</p>
                  <p className="text-6xl font-black text-white italic tracking-tighter">${(cajaHoy / (turnosHoy.filter((t:any)=>t.estado==='finalizado').length || 1)).toFixed(0)}</p>
                  <p className="text-[10px] text-[#10b981] font-black uppercase mt-6 tracking-widest">Inversión por cliente</p>
                </div>
                <div className="bg-[#10b981] p-12 rounded-[4rem] text-[#020617] shadow-xl">
                  <p className="text-[10px] font-black uppercase tracking-widest mb-4 opacity-60">Staff Efficiency</p>
                  <p className="text-6xl font-black italic tracking-tighter">84%</p>
                  <p className="text-[10px] font-black uppercase mt-6 tracking-widest opacity-60">Nivel de ocupación</p>
                </div>
              </div>
              
              <div className="p-20 text-center border-2 border-dashed border-white/10 rounded-[5rem] bg-[#0f172a]/20">
                <p className="text-slate-600 font-black uppercase tracking-[0.4em] text-sm italic">Proyecciones de IA en proceso...</p>
              </div>
            </div>
          )}

          {/* SECCIÓN SUPERADMIN MASTER */}
          {seccionActiva === 'admin' && rol === 'superadmin' && (
            <div className="space-y-12 animate-in slide-in-from-right-10 duration-1000">
               <h3 className="text-6xl font-black text-white italic uppercase tracking-tighter">Control <span className="text-[#10b981]">Global</span></h3>
               <div className="bg-[#0f172a] p-16 rounded-[5rem] border border-[#10b981]/20 shadow-inner">
                 <p className="text-[12px] font-black text-[#10b981] uppercase mb-10 tracking-[0.5em] text-center">Registrar Nueva Entidad en la Red</p>
                 <form onSubmit={handleCrearNegocio} className="flex gap-6 max-w-4xl mx-auto">
                   <input type="text" value={fNegocio.nombre} onChange={e => setFNegocio({nombre: e.target.value})} placeholder="Ej: Barbería Las Rojas" className="flex-1 bg-[#020617] border border-white/10 p-7 rounded-[2.5rem] text-lg text-white font-black outline-none focus:border-[#10b981] shadow-2xl uppercase" />
                   <button className="bg-white text-black px-12 rounded-[2.5rem] font-black uppercase text-xs hover:bg-[#10b981] transition-all active:scale-95 shadow-xl">Desplegar</button>
                 </form>
               </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}