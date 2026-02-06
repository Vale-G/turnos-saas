'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function Home() {
  const [negocios, setNegocios] = useState<any[]>([])
  const [negocioActual, setNegocioActual] = useState<any>(null)
  const [seccionActiva, setSeccionActiva] = useState<'agenda' | 'servicios' | 'staff' | 'analytics' | 'admin'>('agenda')
  const [rol, setRol] = useState<'superadmin' | 'admin' | 'peluquero' | 'cliente'>('superadmin')
  
  // --- ESTADOS DE FORMULARIOS ---
  const [nombreCliente, setNombreCliente] = useState('')
  const [servicioId, setServicioId] = useState('')
  const [staffId, setStaffId] = useState('')
  const [fechaTurno, setFechaTurno] = useState('')
  const [filtroFecha, setFiltroFecha] = useState(new Date().toISOString().split('T')[0])
  
  // --- ESTADOS DE GESTIÓN ---
  const [nuevoNegocioNombre, setNuevoNegocioNombre] = useState('')
  const [nuevoNombreStaff, setNuevoNombreStaff] = useState('')
  const [formServicio, setFormServicio] = useState({ nombre: '', precio: '', duracion: '' })
  const [cargando, setCargando] = useState(false)
  const [mensaje, setMensaje] = useState({ texto: '', tipo: '' })

  const cargarDatos = async () => {
    setCargando(true)
    const { data } = await supabase.from('Negocio').select(`
        id, nombre, plan,
        Servicio (id, nombre, precio, duracion_minutos),
        Staff (id, nombre, activo),
        turnos (id, nombre_cliente, hora_inicio, estado, staff_id, Staff(nombre), Servicio (id, nombre, precio))
      `)
    if (data) {
      setNegocios(data)
      setNegocioActual((prev: any) => prev ? data.find((n: any) => n.id === prev.id) || data[0] : data[0])
    }
    setCargando(false)
  }

  useEffect(() => { cargarDatos() }, [])

  // --- HELPER: NOTIFICACIONES ---
  const mostrarMensaje = (texto: string, tipo: 'success' | 'error') => {
    setMensaje({ texto, tipo })
    setTimeout(() => setMensaje({ texto: '', tipo: '' }), 3000)
  }

  // --- LÓGICA DE NEGOCIO AVANZADA ---
  const handleCrearTurno = async (e: any) => {
    e.preventDefault()
    
    // VALIDACIÓN DE CONFLICTO: ¿El peluquero está libre?
    const yaExiste = negocioActual.turnos?.find((t: any) => 
      t.staff_id === staffId && 
      t.hora_inicio === new Date(fechaTurno).toISOString() &&
      t.estado !== 'finalizado'
    )

    if (yaExiste) {
      mostrarMensaje('❌ El profesional ya tiene un turno a esa hora', 'error')
      return
    }

    const { error } = await supabase.from('turnos').insert([{
      negocio_id: negocioActual.id,
      nombre_cliente: nombreCliente,
      servicio_id: servicioId,
      staff_id: staffId,
      hora_inicio: new Date(fechaTurno).toISOString(),
      estado: 'pendiente'
    }])

    if (!error) {
      setNombreCliente(''); setServicioId(''); setStaffId(''); setFechaTurno('');
      mostrarMensaje('🚀 Turno agendado con éxito', 'success')
      await cargarDatos()
    }
  }

  const handleCrearServicio = async (e: any) => {
    e.preventDefault()
    const { error } = await supabase.from('Servicio').insert([{
      negocio_id: negocioActual.id,
      nombre: formServicio.nombre,
      precio: parseFloat(formServicio.precio),
      duracion_minutos: parseInt(formServicio.duracion)
    }])
    if (!error) {
      setFormServicio({ nombre: '', precio: '', duracion: '' })
      mostrarMensaje('✅ Servicio añadido al catálogo', 'success')
      await cargarDatos()
    }
  }

  const handleCrearStaff = async (e: any) => {
    e.preventDefault()
    const { error } = await supabase.from('Staff').insert([{ negocio_id: negocioActual.id, nombre: nuevoNombreStaff }])
    if (!error) {
      setNuevoNombreStaff('')
      mostrarMensaje('👤 Nuevo profesional activado', 'success')
      await cargarDatos()
    }
  }

  const handleCrearNegocio = async (e: any) => {
    e.preventDefault()
    const { error } = await supabase.from('Negocio').insert([{ nombre: nuevoNegocioNombre, plan: 'basico' }])
    if (!error) {
      setNuevoNegocioNombre('')
      mostrarMensaje('🏢 Ecosistema creado correctamente', 'success')
      await cargarDatos()
    }
  }

  // --- ANALYTICS ENGINE ---
  const turnosDia = negocioActual?.turnos?.filter((t: any) => t.hora_inicio.includes(filtroFecha)) || []
  const facturacion = turnosDia.filter((t: any) => t.estado === 'finalizado').reduce((acc: number, t: any) => acc + (t.Servicio?.precio || 0), 0)
  const ocupacion = negocioActual?.Staff?.length > 0 ? (turnosDia.length / (negocioActual.Staff.length * 8) * 100).toFixed(0) : 0

  if (!negocioActual) return (
    <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center gap-6">
      <div className="w-16 h-16 border-4 border-[#10b981] border-t-transparent rounded-full animate-spin"></div>
      <p className="text-[#10b981] font-black uppercase tracking-[0.5em] animate-pulse">Iniciando Valentin Core...</p>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#020617] text-slate-300 flex font-sans overflow-hidden">
      
      {/* SIDEBAR ULTRA-MODERNA */}
      <aside className="w-80 border-r border-white/5 bg-[#020617] flex flex-col p-8 gap-10 sticky top-0 h-screen z-50 shadow-2xl">
        <div className="flex items-center gap-4 group cursor-pointer">
          <div className="w-14 h-14 bg-gradient-to-tr from-[#10b981] to-[#059669] rounded-[1.25rem] flex items-center justify-center text-[#020617] font-black text-3xl shadow-[0_0_40px_rgba(16,185,129,0.3)] group-hover:rotate-6 transition-transform">V</div>
          <div>
            <h1 className="font-black italic text-white text-2xl tracking-tighter uppercase leading-none">Valentin</h1>
            <p className="text-[10px] text-[#10b981] font-black uppercase tracking-[0.3em] mt-1">Platform v2.0</p>
          </div>
        </div>

        <nav className="flex flex-col gap-2 flex-1">
          {[
            { id: 'agenda', label: 'Agenda Operativa', icon: '🗓️', roles: ['superadmin', 'admin', 'peluquero', 'cliente'] },
            { id: 'servicios', label: 'Catálogo Precios', icon: '💎', roles: ['superadmin', 'admin', 'cliente'] },
            { id: 'staff', label: 'Gestión Humana', icon: '👔', roles: ['superadmin', 'admin'] },
            { id: 'analytics', label: 'Inteligencia Negocio', icon: '📊', roles: ['superadmin', 'admin'] },
            { id: 'admin', label: 'Control Maestro', icon: '⚡', roles: ['superadmin'] },
          ].map((item) => item.roles.includes(rol) && (
            <button key={item.id} onClick={() => setSeccionActiva(item.id as any)} className={`flex items-center justify-between p-5 rounded-3xl text-[10px] font-black uppercase tracking-widest transition-all ${seccionActiva === item.id ? 'bg-[#10b981] text-[#020617] shadow-xl translate-x-2' : 'hover:bg-white/5 text-slate-500 hover:text-white'}`}>
              <span className="flex items-center gap-4"><span className="text-xl">{item.icon}</span> {item.label}</span>
              {seccionActiva === item.id && <span className="w-2 h-2 bg-[#020617] rounded-full animate-ping"></span>}
            </button>
          ))}
        </nav>

        {/* FEEDBACK SYSTEM */}
        {mensaje.texto && (
          <div className={`p-4 rounded-2xl text-[10px] font-black uppercase text-center animate-bounce ${mensaje.tipo === 'success' ? 'bg-[#10b981]/20 text-[#10b981]' : 'bg-red-500/20 text-red-500'}`}>
            {mensaje.texto}
          </div>
        )}

        <div className="bg-[#0f172a] p-6 rounded-[2.5rem] border border-white/5">
          <p className="text-[9px] font-black text-slate-600 uppercase mb-4 text-center tracking-widest italic">Sesión de Desarrollador</p>
          <div className="grid grid-cols-2 gap-2">
            {['admin', 'peluquero', 'cliente', 'superadmin'].map(r => (
              <button key={r} onClick={() => { setRol(r as any); setSeccionActiva('agenda'); }} className={`px-2 py-3 rounded-xl text-[8px] font-black uppercase transition-all ${rol === r ? 'bg-white text-black shadow-lg' : 'text-slate-600 hover:text-white hover:bg-white/5'}`}>{r}</button>
            ))}
          </div>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto relative">
        {/* HEADER PRO */}
        <header className="p-12 border-b border-white/5 flex justify-between items-center bg-[#020617]/80 backdrop-blur-2xl sticky top-0 z-40">
          <div className="flex items-center gap-8">
            <div>
              <h2 className="text-5xl font-black text-white italic uppercase tracking-tighter leading-none">{negocioActual.nombre}</h2>
              <div className="flex gap-4 mt-3">
                <span className="px-4 py-1 rounded-full bg-[#10b981]/10 text-[#10b981] text-[10px] font-black uppercase tracking-widest border border-[#10b981]/20">Enterprise</span>
                <span className="px-4 py-1 rounded-full bg-white/5 text-slate-500 text-[10px] font-black uppercase tracking-widest border border-white/10">{rol} Mode</span>
              </div>
            </div>
          </div>
          <select value={negocioActual.id} onChange={(e) => setNegocioActual(negocios.find(n => n.id === e.target.value))} className="bg-[#0f172a] border border-white/10 text-white text-[10px] font-black p-5 rounded-[1.5rem] outline-none hover:border-[#10b981] transition-all cursor-pointer shadow-2xl uppercase">
            {negocios.map(n => <option key={n.id} value={n.id}>{n.nombre}</option>)}
          </select>
        </header>

        <div className="p-12 max-w-[1400px] mx-auto">
          
          {/* SECCIÓN: AGENDA */}
          {seccionActiva === 'agenda' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 animate-in fade-in slide-in-from-bottom-10 duration-1000">
              <div className="lg:col-span-8 space-y-12">
                <div className="flex justify-between items-end bg-[#0f172a]/20 p-8 rounded-[3rem] border border-white/5">
                  <div>
                    <h3 className="text-3xl font-black text-white italic uppercase tracking-tighter">Agenda Operativa</h3>
                    <p className="text-[10px] text-slate-500 font-bold uppercase mt-2 tracking-widest">Visualización de flujo en tiempo real</p>
                  </div>
                  <input type="date" value={filtroFecha} onChange={e => setFiltroFecha(e.target.value)} className="bg-[#020617] border border-white/10 p-4 rounded-2xl text-[#10b981] font-black text-xs outline-none focus:border-[#10b981] shadow-xl" />
                </div>
                
                <div className="space-y-6">
                  {turnosDia.length > 0 ? turnosDia.map((t: any) => (
                    <div key={t.id} className={`p-8 rounded-[3.5rem] border transition-all flex justify-between items-center group relative overflow-hidden ${t.estado === 'proceso' ? 'bg-[#10b981]/5 border-[#10b981]/50 shadow-[0_0_60px_rgba(16,185,129,0.05)]' : 'bg-[#0f172a] border-white/5 hover:border-[#10b981]/30 hover:bg-[#0f172a]/80'}`}>
                      <div className="flex items-center gap-10 relative z-10">
                        <div className="w-20 h-20 bg-[#020617] rounded-[2rem] flex items-center justify-center border border-white/10 font-black text-2xl text-[#10b981] shadow-inner group-hover:scale-105 transition-transform duration-500">
                          {new Date(t.hora_inicio).getHours()}:00
                        </div>
                        <div>
                          <p className="font-black text-white text-3xl uppercase italic tracking-tighter leading-none">{t.nombre_cliente}</p>
                          <div className="flex items-center gap-3 mt-3">
                            <span className="text-[11px] text-slate-400 font-bold uppercase">{t.Servicio?.nombre}</span>
                            <span className="w-1.5 h-1.5 bg-slate-700 rounded-full"></span>
                            <span className="text-[11px] text-[#10b981] font-black uppercase tracking-widest">Con: {t.Staff?.nombre || 'General'}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-6 relative z-10">
                        <div className="text-right">
                          <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1">Estado</p>
                          <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-tighter ${t.estado === 'pendiente' ? 'bg-amber-500/10 text-amber-500' : t.estado === 'proceso' ? 'bg-blue-500/10 text-blue-500' : 'bg-[#10b981]/10 text-[#10b981]'}`}>{t.estado}</span>
                        </div>
                        {['admin', 'peluquero'].includes(rol) && t.estado !== 'finalizado' && (
                          <button onClick={async () => {
                            const nEst = t.estado === 'pendiente' ? 'proceso' : 'finalizado';
                            await supabase.from('turnos').update({ estado: nEst }).eq('id', t.id);
                            cargarDatos();
                          }} className="bg-white text-black px-10 py-4 rounded-[1.5rem] font-black text-[11px] uppercase hover:bg-[#10b981] transition-all shadow-xl active:scale-95">
                            {t.estado === 'pendiente' ? 'Iniciar' : 'Cobrar'}
                          </button>
                        )}
                      </div>
                    </div>
                  )) : (
                    <div className="py-32 text-center border-4 border-dashed border-white/5 rounded-[5rem] bg-[#0f172a]/10">
                      <div className="text-8xl mb-8 opacity-10 animate-pulse">🗓️</div>
                      <p className="text-slate-600 font-black uppercase tracking-[0.5em] text-sm">Sin registros operativos</p>
                    </div>
                  )}
                </div>
              </div>

              {/* COLUMNA: RESERVA INTELIGENTE */}
              <div className="lg:col-span-4 space-y-10">
                {rol !== 'superadmin' && (
                  <section className="bg-[#0f172a] p-10 rounded-[4rem] border border-white/10 shadow-2xl relative group overflow-hidden">
                    <div className="absolute top-0 right-0 p-10 text-6xl opacity-5 group-hover:scale-110 transition-transform">💎</div>
                    <h4 className="text-white font-black uppercase italic mb-10 tracking-tighter text-2xl">Nueva Reserva</h4>
                    <form onSubmit={handleCrearTurno} className="space-y-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase ml-4">Nombre del Cliente</label>
                        <input type="text" placeholder="Ej: Juan Pérez" value={nombreCliente} onChange={e => setNombreCliente(e.target.value)} className="w-full bg-[#020617] border border-white/5 p-5 rounded-[1.5rem] text-xs text-white focus:border-[#10b981] outline-none" required />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase ml-4">Servicio</label>
                        <select value={servicioId} onChange={e => setServicioId(e.target.value)} className="w-full bg-[#020617] border border-white/5 p-5 rounded-[1.5rem] text-xs text-white outline-none focus:border-[#10b981]" required>
                          <option value="">Seleccionar catálogo...</option>
                          {negocioActual.Servicio?.map((s: any) => <option key={s.id} value={s.id}>{s.nombre} (${s.precio})</option>)}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase ml-4">Peluquero Asignado</label>
                        <select value={staffId} onChange={e => setStaffId(e.target.value)} className="w-full bg-[#020617] border border-white/5 p-5 rounded-[1.5rem] text-xs text-white outline-none focus:border-[#10b981]" required>
                          <option value="">¿Quién atiende?</option>
                          {negocioActual.Staff?.filter((s: any) => s.activo).map((s: any) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase ml-4">Fecha y Hora</label>
                        <input type="datetime-local" value={fechaTurno} onChange={e => setFechaTurno(e.target.value)} className="w-full bg-[#020617] border border-white/5 p-5 rounded-[1.5rem] text-xs text-white" required />
                      </div>
                      <button className="w-full bg-[#10b981] text-black font-black py-6 rounded-[2rem] uppercase text-[11px] tracking-[0.2em] shadow-2xl shadow-[#10b981]/20 hover:bg-white transition-all transform hover:-translate-y-1 active:scale-95">Confirmar Reserva</button>
                    </form>
                  </section>
                )}
                
                {['admin', 'peluquero', 'superadmin'].includes(rol) && (
                  <div className="p-12 bg-gradient-to-br from-[#10b981] to-[#059669] rounded-[4rem] text-[#020617] shadow-[0_30px_60px_rgba(16,185,129,0.2)]">
                    <p className="text-[11px] font-black uppercase tracking-[0.3em] opacity-60">Liquidación Diaria</p>
                    <p className="text-7xl font-black italic tracking-tighter my-4">${facturacion}</p>
                    <div className="grid grid-cols-2 gap-6 mt-8 pt-8 border-t border-[#020617]/10">
                      <div>
                        <p className="text-[9px] font-black uppercase opacity-60">Ocupación</p>
                        <p className="text-2xl font-black italic">{ocupacion}%</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[9px] font-black uppercase opacity-60">Turnos</p>
                        <p className="text-2xl font-black italic">{turnosDia.length}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* SECCIÓN: SERVICIOS */}
          {seccionActiva === 'servicios' && (
            <div className="space-y-16 animate-in slide-in-from-right-10 duration-700">
              <h3 className="text-6xl font-black text-white italic uppercase tracking-tighter">Catálogo de <span className="text-[#10b981]">Excelencia</span></h3>
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
                <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-8">
                  {negocioActual.Servicio?.map((s: any) => (
                    <div key={s.id} className="bg-[#0f172a] p-12 rounded-[4rem] border border-white/5 relative group hover:border-[#10b981]/50 transition-all duration-500 shadow-xl">
                      <div className="absolute top-8 left-8 text-[10px] text-[#10b981] font-black uppercase tracking-widest bg-[#10b981]/10 px-4 py-1 rounded-full">Pro Service</div>
                      <p className="text-white font-black uppercase italic text-3xl tracking-tighter mt-10">{s.nombre}</p>
                      <div className="flex items-end justify-between mt-12">
                        <div>
                          <p className="text-[11px] text-slate-500 font-black uppercase tracking-widest mb-2 italic">Precio Final</p>
                          <p className="text-[#10b981] font-black text-5xl italic tracking-tighter">${s.precio}</p>
                        </div>
                        <p className="text-[11px] text-slate-500 font-black uppercase mb-2">⏱️ {s.duracion_minutos} MIN</p>
                      </div>
                      {rol === 'admin' && (
                        <button onClick={async () => {
                          if (confirm('¿Eliminar servicio?')) {
                            await supabase.from('Servicio').delete().eq('id', s.id)
                            cargarDatos()
                          }
                        }} className="absolute top-10 right-10 text-[10px] text-red-500 font-black uppercase opacity-0 group-hover:opacity-100 transition-opacity hover:underline">Remover</button>
                      )}
                    </div>
                  ))}
                </div>
                {rol === 'admin' && (
                  <div className="lg:col-span-4 bg-[#0f172a]/50 backdrop-blur-md border border-[#10b981]/20 p-12 rounded-[4rem] shadow-2xl h-fit">
                    <h4 className="text-white font-black uppercase italic mb-8 tracking-tighter text-xl">Expandir Catálogo</h4>
                    <form onSubmit={handleCrearServicio} className="space-y-6">
                      <input type="text" placeholder="Nombre" value={formServicio.nombre} onChange={e => setFormServicio({...formServicio, nombre: e.target.value})} className="w-full bg-[#020617] border border-white/5 p-6 rounded-[1.5rem] text-sm text-white focus:border-[#10b981] outline-none" required />
                      <input type="number" placeholder="Inversión ($)" value={formServicio.precio} onChange={e => setFormServicio({...formServicio, precio: e.target.value})} className="w-full bg-[#020617] border border-white/5 p-6 rounded-[1.5rem] text-sm text-white focus:border-[#10b981] outline-none" required />
                      <input type="number" placeholder="Minutos" value={formServicio.duracion} onChange={e => setFormServicio({...formServicio, duracion: e.target.value})} className="w-full bg-[#020617] border border-white/5 p-6 rounded-[1.5rem] text-sm text-white focus:border-[#10b981] outline-none" required />
                      <button className="w-full bg-[#10b981] text-black font-black py-6 rounded-[2rem] uppercase text-[11px] tracking-widest shadow-xl">Publicar Servicio</button>
                    </form>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* SECCIÓN: ANALYTICS */}
          {seccionActiva === 'analytics' && (
            <div className="space-y-16 animate-in zoom-in-95 duration-1000">
              <h3 className="text-6xl font-black text-white italic uppercase tracking-tighter">Business <span className="text-[#10b981]">Intelligence</span></h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                {[
                  { label: 'Ocupación', value: ocupacion + '%', trend: '↑ 12%' },
                  { label: 'Facturación', value: '$' + facturacion, trend: 'Nuevo record' },
                  { label: 'Clientes Nuevos', value: '14', trend: '↑ 4' },
                  { label: 'Servicio Top', value: negocioActual.Servicio?.[0]?.nombre || '---', trend: 'Popular' },
                ].map((stat, i) => (
                  <div key={i} className="bg-[#0f172a] p-10 rounded-[3rem] border border-white/5 hover:border-[#10b981]/20 transition-all">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">{stat.label}</p>
                    <p className="text-4xl font-black text-white italic tracking-tighter">{stat.value}</p>
                    <p className="text-[10px] text-[#10b981] font-black uppercase mt-4">{stat.trend}</p>
                  </div>
                ))}
              </div>
              <div className="bg-[#0f172a]/20 p-24 rounded-[5rem] border border-dashed border-white/5 text-center flex flex-col items-center gap-6">
                <div className="text-7xl opacity-20">📡</div>
                <h4 className="text-2xl font-black text-slate-500 uppercase italic tracking-tighter">Proyección de Ingresos Semanal</h4>
                <p className="text-[10px] text-slate-700 font-black uppercase tracking-[0.5em]">Módulo de IA en procesamiento...</p>
              </div>
            </div>
          )}

          {/* SECCIÓN: STAFF */}
          {seccionActiva === 'staff' && (
            <div className="space-y-16 animate-in fade-in duration-700">
              <h3 className="text-6xl font-black text-white italic uppercase tracking-tighter">Capital <span className="text-[#10b981]">Humano</span></h3>
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
                <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-3 gap-8">
                  {negocioActual.Staff?.map((s: any) => (
                    <div key={s.id} className="bg-[#0f172a] p-12 rounded-[4rem] border border-white/5 text-center relative group">
                      <div className="w-28 h-28 bg-gradient-to-br from-[#10b981]/10 to-transparent rounded-full flex items-center justify-center text-5xl mx-auto mb-8 shadow-2xl group-hover:scale-110 transition-transform">👤</div>
                      <p className="text-white font-black uppercase italic text-2xl tracking-tighter leading-none">{s.nombre}</p>
                      <span className="inline-block mt-4 px-4 py-1 bg-[#10b981]/10 text-[#10b981] text-[9px] font-black uppercase rounded-full border border-[#10b981]/20">Especialista</span>
                      {rol === 'admin' && (
                        <button onClick={async () => {
                           await supabase.from('Staff').update({ activo: !s.activo }).eq('id', s.id)
                           cargarDatos()
                        }} className="absolute top-10 right-10 text-[9px] font-black uppercase text-slate-500 hover:text-white transition-colors">
                          {s.activo ? 'Desactivar' : 'Activar'}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                {rol === 'admin' && (
                  <div className="lg:col-span-4 bg-[#0f172a] p-12 rounded-[4rem] border border-white/5 h-fit shadow-2xl">
                    <h4 className="text-white font-black uppercase italic mb-10 tracking-tighter text-xl">Añadir Profesional</h4>
                    <form onSubmit={handleCrearStaff} className="space-y-6">
                      <input type="text" placeholder="Nombre completo" value={nuevoNombreStaff} onChange={e => setNuevoNombreStaff(e.target.value)} className="w-full bg-[#020617] border border-white/5 p-6 rounded-[1.5rem] text-sm text-white focus:border-[#10b981] outline-none" required />
                      <button className="w-full bg-[#10b981] text-black font-black py-6 rounded-[2rem] uppercase text-[11px] tracking-widest shadow-xl">Integrar Staff</button>
                    </form>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* SECCIÓN: SUPERADMIN */}
          {seccionActiva === 'admin' && rol === 'superadmin' && (
            <div className="space-y-16 animate-in slide-in-from-right-10 duration-1000">
              <h3 className="text-6xl font-black text-white italic uppercase tracking-tighter">Control <span className="text-[#10b981]">Maestro</span></h3>
              <div className="bg-gradient-to-br from-[#0f172a] to-[#020617] p-16 rounded-[5rem] border border-[#10b981]/20 shadow-inner">
                <p className="text-[12px] font-black text-[#10b981] uppercase mb-10 tracking-[0.5em] text-center">Alta de Nueva Entidad en la Red</p>
                <form onSubmit={handleCrearNegocio} className="flex gap-6 max-w-4xl mx-auto">
                  <input type="text" value={nuevoNegocioNombre} onChange={e => setNuevoNegocioNombre(e.target.value)} placeholder="Ej: Barbería Las Rojas" className="flex-1 bg-[#020617] border border-white/10 p-7 rounded-[2rem] text-lg text-white font-black outline-none focus:border-[#10b981] shadow-2xl uppercase italic" />
                  <button className="bg-white text-black px-12 rounded-[2rem] font-black uppercase text-xs hover:bg-[#10b981] transition-all shadow-xl active:scale-95">Desplegar</button>
                </form>
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  )
}