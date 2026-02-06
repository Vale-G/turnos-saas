'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function Home() {
  const [negocios, setNegocios] = useState<any[]>([])
  const [negocioActual, setNegocioActual] = useState<any>(null)
  const [seccionActiva, setSeccionActiva] = useState<'agenda' | 'servicios' | 'admin' | 'analytics'>('agenda')
  const [rol, setRol] = useState<'superadmin' | 'admin' | 'peluquero' | 'cliente'>('superadmin')
  
  // States: Formularios Turnos
  const [nombreCliente, setNombreCliente] = useState('')
  const [servicioId, setServicioId] = useState('')
  const [fechaTurno, setFechaTurno] = useState('')
  const [filtroFecha, setFiltroFecha] = useState(new Date().toISOString().split('T')[0])
  
  // States: Gestión SaaS y Servicios
  const [nuevoNegocioNombre, setNuevoNegocioNombre] = useState('')
  const [formServicio, setFormServicio] = useState({ nombre: '', precio: '', duracion: '' })

  const cargarDatos = async () => {
    const { data } = await supabase.from('Negocio').select(`
        id, nombre, plan,
        Servicio (id, nombre, precio, duracion_minutos), 
        turnos (id, nombre_cliente, hora_inicio, estado, Servicio (nombre, precio, duracion_minutos))
      `)
    if (data) {
      setNegocios(data)
      setNegocioActual((prev: any) => prev ? data.find((n: any) => n.id === prev.id) || data[0] : data[0])
    }
  }

  useEffect(() => { cargarDatos() }, [])

  // --- ACCIONES SAAS (SUPERADMIN) ---
  const handleCrearNegocio = async (e: any) => {
    e.preventDefault()
    if (!nuevoNegocioNombre) return
    const { error } = await supabase.from('Negocio').insert([{ nombre: nuevoNegocioNombre, plan: 'basico' }])
    if (!error) {
      setNuevoNegocioNombre('')
      await cargarDatos()
    }
  }

  // --- ACCIONES SERVICIOS (ADMIN) ---
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
      await cargarDatos()
    }
  }

  const eliminarServicio = async (id: string) => {
    const { error } = await supabase.from('Servicio').delete().eq('id', id)
    if (!error) await cargarDatos()
  }

  // --- ACCIONES TURNOS (CLIENTE/STAFF) ---
  const handleCrearTurno = async (e: any) => {
    e.preventDefault()
    const { error } = await supabase.from('turnos').insert([{
      negocio_id: negocioActual.id,
      nombre_cliente: nombreCliente,
      servicio_id: servicioId,
      hora_inicio: new Date(fechaTurno).toISOString(),
      estado: 'pendiente'
    }])
    if (!error) {
      setNombreCliente(''); setServicioId(''); setFechaTurno('');
      await cargarDatos()
    }
  }

  const turnosHoy = negocioActual?.turnos?.filter((t: any) => t.hora_inicio.includes(filtroFecha)) || []
  const recaudacionTotal = turnosHoy.filter((t: any) => t.estado === 'finalizado')
    .reduce((acc: number, t: any) => acc + (t.Servicio?.precio || 0), 0)

  if (!negocioActual) return <div className="min-h-screen bg-[#020617] flex items-center justify-center text-[#10b981] font-black uppercase tracking-widest animate-pulse">Cargando Valentin Platform...</div>

  return (
    <div className="min-h-screen bg-[#020617] text-slate-300 flex font-sans">
      
      {/* SIDEBAR */}
      <aside className="w-64 border-r border-white/5 bg-[#020617] flex flex-col p-6 gap-8 sticky top-0 h-screen">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-[#10b981] rounded-lg flex items-center justify-center text-[#020617] font-black shadow-[0_0_15px_rgba(16,185,129,0.3)]">V</div>
          <h1 className="font-black italic text-white text-lg tracking-tighter uppercase">Platform</h1>
        </div>

        <nav className="flex flex-col gap-2 flex-1">
          {[
            { id: 'agenda', label: 'Agenda', icon: '📅', roles: ['superadmin', 'admin', 'peluquero', 'cliente'] },
            { id: 'servicios', label: 'Servicios', icon: '✂️', roles: ['superadmin', 'admin', 'peluquero', 'cliente'] },
            { id: 'analytics', label: 'Reportes', icon: '📊', roles: ['superadmin', 'admin'] },
            { id: 'admin', label: 'Configuración', icon: '⚙️', roles: ['superadmin'] },
          ].map((item) => {
            if (item.roles.includes(rol)) {
              return (
                <button key={item.id} onClick={() => setSeccionActiva(item.id as any)} className={`flex items-center gap-3 p-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${seccionActiva === item.id ? 'bg-[#10b981] text-[#020617]' : 'hover:bg-white/5 text-slate-500'}`}>
                  <span>{item.icon}</span> {item.label}
                </button>
              )
            }
            return null
          })}
        </nav>

        <div className="bg-[#0f172a] p-4 rounded-2xl border border-white/5">
          <p className="text-[8px] font-black text-slate-500 uppercase mb-3 text-center tracking-[0.2em]">Simular Rol</p>
          <div className="grid grid-cols-2 gap-1">
            {['admin', 'peluquero', 'cliente', 'superadmin'].map(r => (
              <button key={r} onClick={() => { setRol(r as any); setSeccionActiva('agenda'); }} className={`px-1 py-1 rounded text-[7px] font-black uppercase transition-colors ${rol === r ? 'bg-white text-black' : 'text-slate-600 hover:text-white'}`}>{r}</button>
            ))}
          </div>
        </div>
      </aside>

      <main className="flex-1">
        <header className="p-8 border-b border-white/5 flex justify-between items-center bg-[#020617]/80 backdrop-blur-md sticky top-0 z-40">
          <div>
            <h2 className="text-2xl font-black text-white italic uppercase tracking-tighter">{negocioActual.nombre}</h2>
            <p className="text-[10px] text-[#10b981] font-black uppercase tracking-widest">Acceso: {rol}</p>
          </div>
          <select value={negocioActual.id} onChange={(e) => setNegocioActual(negocios.find(n => n.id === e.target.value))} className="bg-[#0f172a] border border-white/10 text-white text-[10px] font-black p-3 rounded-xl outline-none uppercase cursor-pointer">
            {negocios.map(n => <option key={n.id} value={n.id}>{n.nombre}</option>)}
          </select>
        </header>

        <div className="p-8">
          {/* SECCIÓN AGENDA */}
          {seccionActiva === 'agenda' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 animate-in fade-in duration-500">
              <div className="lg:col-span-8 space-y-8">
                <div className="flex justify-between items-center">
                  <h3 className="text-4xl font-black text-white italic uppercase tracking-tighter">Agenda <span className="text-[#10b981]">Hoy</span></h3>
                  <input type="date" value={filtroFecha} onChange={e => setFiltroFecha(e.target.value)} className="bg-[#0f172a] border border-white/10 p-3 rounded-xl text-[#10b981] font-black text-xs outline-none" />
                </div>
                <div className="space-y-4">
                  {turnosHoy.map((t: any) => (
                    <div key={t.id} className={`p-6 rounded-[2rem] border flex justify-between items-center ${t.estado === 'proceso' ? 'bg-[#10b981]/5 border-[#10b981]' : 'bg-[#0f172a] border-white/5'}`}>
                      <div className="flex items-center gap-6">
                        <div className="w-14 h-14 bg-[#020617] rounded-2xl flex items-center justify-center border border-[#10b981]/20 font-black text-[#10b981] text-xs">#{new Date(t.hora_inicio).getHours()}:00</div>
                        <div>
                          <p className="font-black text-white text-xl uppercase italic tracking-tighter">{t.nombre_cliente}</p>
                          <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest">{t.Servicio?.nombre} — <span className="text-[#10b981]">{t.estado}</span></p>
                        </div>
                      </div>
                      {['admin', 'peluquero'].includes(rol) && t.estado !== 'finalizado' && (
                        <button onClick={async () => {
                          const nEst = t.estado === 'pendiente' ? 'proceso' : 'finalizado';
                          await supabase.from('turnos').update({ estado: nEst }).eq('id', t.id);
                          cargarDatos();
                        }} className="bg-white text-black px-6 py-2 rounded-xl font-black text-[10px] uppercase hover:bg-[#10b981] transition-colors">
                          {t.estado === 'pendiente' ? 'Atender' : 'Cobrar'}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="lg:col-span-4 space-y-6">
                {rol !== 'superadmin' && (
                  <section className="bg-[#0f172a] p-8 rounded-[2.5rem] border border-white/10">
                    <h4 className="text-white font-black uppercase italic mb-6 tracking-tighter">Nueva Reserva</h4>
                    <form onSubmit={handleCrearTurno} className="space-y-4">
                      <input type="text" placeholder="Tu Nombre" value={nombreCliente} onChange={e => setNombreCliente(e.target.value)} className="w-full bg-[#020617] border border-white/5 p-4 rounded-xl text-xs outline-none text-white focus:border-[#10b981]" required />
                      <select value={servicioId} onChange={e => setServicioId(e.target.value)} className="w-full bg-[#020617] border border-white/5 p-4 rounded-xl text-xs outline-none text-white focus:border-[#10b981]" required>
                        <option value="">Servicio...</option>
                        {negocioActual.Servicio?.map((s: any) => <option key={s.id} value={s.id}>{s.nombre} (${s.precio})</option>)}
                      </select>
                      <input type="datetime-local" value={fechaTurno} onChange={e => setFechaTurno(e.target.value)} className="w-full bg-[#020617] border border-white/5 p-4 rounded-xl text-xs text-white" required />
                      <button className="w-full bg-[#10b981] text-black font-black py-4 rounded-xl uppercase text-[10px] tracking-widest hover:bg-white transition-all">Confirmar</button>
                    </form>
                  </section>
                )}
                {['admin', 'peluquero', 'superadmin'].includes(rol) && (
                  <div className="p-8 bg-[#10b981] rounded-[2.5rem] text-[#020617]">
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Recaudación</p>
                    <p className="text-5xl font-black italic tracking-tighter">${recaudacionTotal}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* SECCIÓN SERVICIOS */}
          {seccionActiva === 'servicios' && (
            <div className="space-y-12 animate-in fade-in duration-500">
              <h3 className="text-4xl font-black text-white italic uppercase tracking-tighter">Lista de <span className="text-[#10b981]">Servicios</span></h3>
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-6 h-fit">
                  {negocioActual.Servicio?.map((s: any) => (
                    <div key={s.id} className="bg-[#0f172a] p-8 rounded-[2rem] border border-white/5 relative group">
                      <p className="text-white font-black uppercase italic text-lg tracking-tighter">{s.nombre}</p>
                      <p className="text-[#10b981] font-black text-2xl mt-2">${s.precio}</p>
                      <p className="text-[9px] text-slate-500 font-black uppercase mt-4">⏱️ {s.duracion_minutos} min</p>
                      {rol === 'admin' && (
                        <button onClick={() => eliminarServicio(s.id)} className="absolute top-4 right-4 text-xs opacity-0 group-hover:opacity-100 text-red-500 font-black uppercase transition-opacity hover:underline">Eliminar</button>
                      )}
                    </div>
                  ))}
                </div>
                {rol === 'admin' && (
                  <div className="lg:col-span-4 bg-[#020617] border border-[#10b981]/20 p-8 rounded-[2.5rem]">
                    <h4 className="text-white font-black uppercase italic mb-6">Nuevo Servicio</h4>
                    <form onSubmit={handleCrearServicio} className="space-y-4">
                      <input type="text" placeholder="Nombre" value={formServicio.nombre} onChange={e => setFormServicio({...formServicio, nombre: e.target.value})} className="w-full bg-[#0f172a] border border-white/5 p-4 rounded-xl text-xs text-white outline-none focus:border-[#10b981]" required />
                      <input type="number" placeholder="Precio ($)" value={formServicio.precio} onChange={e => setFormServicio({...formServicio, precio: e.target.value})} className="w-full bg-[#0f172a] border border-white/5 p-4 rounded-xl text-xs text-white outline-none focus:border-[#10b981]" required />
                      <input type="number" placeholder="Minutos" value={formServicio.duracion} onChange={e => setFormServicio({...formServicio, duracion: e.target.value})} className="w-full bg-[#0f172a] border border-white/5 p-4 rounded-xl text-xs text-white outline-none focus:border-[#10b981]" required />
                      <button className="w-full bg-[#10b981] text-black font-black py-4 rounded-xl uppercase text-[10px] tracking-widest shadow-lg shadow-[#10b981]/10">Añadir</button>
                    </form>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* SECCIÓN CONFIGURACIÓN (SAAS CONTROL) */}
          {seccionActiva === 'admin' && rol === 'superadmin' && (
            <div className="space-y-10 animate-in slide-in-from-right-4 duration-500">
               <h3 className="text-4xl font-black text-white italic uppercase tracking-tighter">SaaS <span className="text-[#10b981]">Control</span></h3>
               <div className="bg-[#0f172a] p-10 rounded-[3rem] border border-white/5">
                 <p className="text-[10px] font-black text-[#10b981] uppercase mb-6 tracking-widest">Registrar Nuevo Local</p>
                 <form onSubmit={handleCrearNegocio} className="flex gap-4">
                   <input type="text" value={nuevoNegocioNombre} onChange={e => setNuevoNegocioNombre(e.target.value)} placeholder="Nombre del local" className="flex-1 bg-[#020617] border border-white/5 p-5 rounded-2xl text-xs text-white outline-none focus:border-[#10b981]" />
                   <button className="bg-white text-black px-10 rounded-2xl font-black uppercase text-xs hover:bg-[#10b981] transition-colors shadow-lg">Activar</button>
                 </form>
               </div>
            </div>
          )}

        </div>
      </main>
    </div>
  )
}