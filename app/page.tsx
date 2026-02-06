'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function Home() {
  const [negocios, setNegocios] = useState<any[]>([])
  const [negocioActual, setNegocioActual] = useState<any>(null)
  const [seccionActiva, setSeccionActiva] = useState<'agenda' | 'servicios' | 'staff' | 'admin'>('agenda')
  const [rol, setRol] = useState<'superadmin' | 'admin' | 'peluquero' | 'cliente'>('superadmin')
  
  // States: Formularios
  const [nombreCliente, setNombreCliente] = useState('')
  const [servicioId, setServicioId] = useState('')
  const [staffId, setStaffId] = useState('')
  const [fechaTurno, setFechaTurno] = useState('')
  const [filtroFecha, setFiltroFecha] = useState(new Date().toISOString().split('T')[0])
  
  // States: Gestión
  const [nuevoNegocioNombre, setNuevoNegocioNombre] = useState('')
  const [nuevoNombreStaff, setNuevoNombreStaff] = useState('')
  const [formServicio, setFormServicio] = useState({ nombre: '', precio: '', duracion: '' })

  const cargarDatos = async () => {
    const { data } = await supabase.from('Negocio').select(`
        id, nombre, plan,
        Servicio (id, nombre, precio, duracion_minutos),
        Staff (id, nombre, activo),
        turnos (id, nombre_cliente, hora_inicio, estado, staff_id, Staff(nombre), Servicio (nombre, precio))
      `)
    if (data) {
      setNegocios(data)
      setNegocioActual((prev: any) => prev ? data.find((n: any) => n.id === prev.id) || data[0] : data[0])
    }
  }

  useEffect(() => { cargarDatos() }, [])

  // --- GESTIÓN DE STAFF ---
  const handleCrearStaff = async (e: any) => {
    e.preventDefault()
    if (!nuevoNombreStaff) return
    const { error } = await supabase.from('Staff').insert([{ negocio_id: negocioActual.id, nombre: nuevoNombreStaff }])
    if (!error) { setNuevoNombreStaff(''); await cargarDatos(); }
  }

  // --- GESTIÓN DE SERVICIOS ---
  const handleCrearServicio = async (e: any) => {
    e.preventDefault()
    const { error } = await supabase.from('Servicio').insert([{
      negocio_id: negocioActual.id,
      nombre: formServicio.nombre,
      precio: parseFloat(formServicio.precio),
      duracion_minutos: parseInt(formServicio.duracion)
    }])
    if (!error) { setFormServicio({ nombre: '', precio: '', duracion: '' }); await cargarDatos(); }
  }

  // --- GESTIÓN DE TURNOS ---
  const handleCrearTurno = async (e: any) => {
    e.preventDefault()
    const { error } = await supabase.from('turnos').insert([{
      negocio_id: negocioActual.id,
      nombre_cliente: nombreCliente,
      servicio_id: servicioId,
      staff_id: staffId,
      hora_inicio: new Date(fechaTurno).toISOString(),
      estado: 'pendiente'
    }])
    if (!error) { setNombreCliente(''); setServicioId(''); setStaffId(''); setFechaTurno(''); await cargarDatos(); }
  }

  const turnosHoy = negocioActual?.turnos?.filter((t: any) => t.hora_inicio.includes(filtroFecha)) || []

  if (!negocioActual) return <div className="min-h-screen bg-[#020617] flex items-center justify-center text-[#10b981] font-black tracking-widest animate-pulse uppercase">Valentin Platform...</div>

  return (
    <div className="min-h-screen bg-[#020617] text-slate-300 flex font-sans">
      
      {/* SIDEBAR */}
      <aside className="w-64 border-r border-white/5 bg-[#020617] flex flex-col p-6 gap-8 sticky top-0 h-screen">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-[#10b981] rounded-lg flex items-center justify-center text-[#020617] font-black">V</div>
          <h1 className="font-black italic text-white text-lg tracking-tighter uppercase">Platform</h1>
        </div>

        <nav className="flex flex-col gap-2 flex-1">
          {[
            { id: 'agenda', label: 'Agenda', icon: '📅', roles: ['superadmin', 'admin', 'peluquero', 'cliente'] },
            { id: 'servicios', label: 'Servicios', icon: '✂️', roles: ['superadmin', 'admin', 'cliente'] },
            { id: 'staff', label: 'Equipo', icon: '👥', roles: ['superadmin', 'admin'] },
            { id: 'admin', label: 'Config', icon: '⚙️', roles: ['superadmin'] },
          ].map((item) => item.roles.includes(rol) && (
            <button key={item.id} onClick={() => setSeccionActiva(item.id as any)} className={`flex items-center gap-3 p-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${seccionActiva === item.id ? 'bg-[#10b981] text-[#020617]' : 'hover:bg-white/5 text-slate-500'}`}>
              <span>{item.icon}</span> {item.label}
            </button>
          ))}
        </nav>

        <div className="bg-[#0f172a] p-4 rounded-2xl border border-white/5">
          <p className="text-[8px] font-black text-slate-500 uppercase mb-3 text-center tracking-widest">Rol: {rol}</p>
          <div className="grid grid-cols-2 gap-1">
            {['admin', 'peluquero', 'cliente', 'superadmin'].map(r => (
              <button key={r} onClick={() => { setRol(r as any); setSeccionActiva('agenda'); }} className={`px-1 py-1 rounded text-[7px] font-black uppercase ${rol === r ? 'bg-white text-black' : 'text-slate-600 hover:text-white'}`}>{r}</button>
            ))}
          </div>
        </div>
      </aside>

      <main className="flex-1">
        <header className="p-8 border-b border-white/5 flex justify-between items-center bg-[#020617]/80 backdrop-blur-md sticky top-0 z-40">
          <h2 className="text-2xl font-black text-white italic uppercase tracking-tighter">{negocioActual.nombre}</h2>
          <select value={negocioActual.id} onChange={(e) => setNegocioActual(negocios.find(n => n.id === e.target.value))} className="bg-[#0f172a] border border-white/10 text-white text-[10px] font-black p-3 rounded-xl uppercase">
            {negocios.map(n => <option key={n.id} value={n.id}>{n.nombre}</option>)}
          </select>
        </header>

        <div className="p-8">
          {/* AGENDA */}
          {seccionActiva === 'agenda' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
              <div className="lg:col-span-8 space-y-8">
                <div className="flex justify-between items-center">
                  <h3 className="text-4xl font-black text-white italic uppercase tracking-tighter">Agenda</h3>
                  <input type="date" value={filtroFecha} onChange={e => setFiltroFecha(e.target.value)} className="bg-[#0f172a] border border-white/10 p-3 rounded-xl text-[#10b981] font-black text-xs" />
                </div>
                <div className="space-y-4">
                  {turnosHoy.map((t: any) => (
                    <div key={t.id} className="p-6 rounded-[2rem] border border-white/5 bg-[#0f172a] flex justify-between items-center">
                      <div className="flex items-center gap-6">
                        <div className="w-14 h-14 bg-[#020617] rounded-2xl flex items-center justify-center border border-[#10b981]/20 font-black text-[#10b981] text-xs">#{new Date(t.hora_inicio).getHours()}:00</div>
                        <div>
                          <p className="font-black text-white text-xl uppercase italic tracking-tighter">{t.nombre_cliente}</p>
                          <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest">
                            {t.Servicio?.nombre} — Con: <span className="text-white">{t.Staff?.nombre || 'Sin asignar'}</span>
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* FORM RESERVA */}
              {rol !== 'superadmin' && (
                <div className="lg:col-span-4">
                  <section className="bg-[#0f172a] p-8 rounded-[2.5rem] border border-white/10">
                    <h4 className="text-white font-black uppercase italic mb-6">Nueva Reserva</h4>
                    <form onSubmit={handleCrearTurno} className="space-y-4">
                      <input type="text" placeholder="Cliente" value={nombreCliente} onChange={e => setNombreCliente(e.target.value)} className="w-full bg-[#020617] border border-white/5 p-4 rounded-xl text-xs text-white" required />
                      <select value={servicioId} onChange={e => setServicioId(e.target.value)} className="w-full bg-[#020617] border border-white/5 p-4 rounded-xl text-xs text-white" required>
                        <option value="">¿Qué servicio?</option>
                        {negocioActual.Servicio?.map((s: any) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                      </select>
                      <select value={staffId} onChange={e => setStaffId(e.target.value)} className="w-full bg-[#020617] border border-white/5 p-4 rounded-xl text-xs text-white" required>
                        <option value="">¿Con quién?</option>
                        {negocioActual.Staff?.filter((s: any) => s.activo).map((s: any) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                      </select>
                      <input type="datetime-local" value={fechaTurno} onChange={e => setFechaTurno(e.target.value)} className="w-full bg-[#020617] border border-white/5 p-4 rounded-xl text-xs text-white" required />
                      <button className="w-full bg-[#10b981] text-black font-black py-4 rounded-xl uppercase text-[10px] tracking-widest">Reservar</button>
                    </form>
                  </section>
                </div>
              )}
            </div>
          )}

          {/* SECCIÓN STAFF (NUEVA) */}
          {seccionActiva === 'staff' && (
            <div className="space-y-12 animate-in fade-in">
              <h3 className="text-4xl font-black text-white italic uppercase tracking-tighter">Mi <span className="text-[#10b981]">Equipo</span></h3>
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-3 gap-6">
                  {negocioActual.Staff?.map((s: any) => (
                    <div key={s.id} className="bg-[#0f172a] p-8 rounded-[2rem] border border-white/5 text-center">
                      <div className="w-16 h-16 bg-[#10b981]/10 rounded-full flex items-center justify-center text-2xl mx-auto mb-4">👤</div>
                      <p className="text-white font-black uppercase italic tracking-tighter">{s.nombre}</p>
                      <p className="text-[9px] text-[#10b981] font-black uppercase mt-2">{s.activo ? 'Activo' : 'Inactivo'}</p>
                    </div>
                  ))}
                </div>
                {rol === 'admin' && (
                  <div className="lg:col-span-4 bg-[#020617] border border-[#10b981]/20 p-8 rounded-[2.5rem]">
                    <h4 className="text-white font-black uppercase italic mb-6">Nuevo Peluquero</h4>
                    <form onSubmit={handleCrearStaff} className="space-y-4">
                      <input type="text" placeholder="Nombre del profesional" value={nuevoNombreStaff} onChange={e => setNuevoNombreStaff(e.target.value)} className="w-full bg-[#0f172a] border border-white/5 p-4 rounded-xl text-xs text-white" required />
                      <button className="w-full bg-[#10b981] text-black font-black py-4 rounded-xl uppercase text-[10px]">Contratar</button>
                    </form>
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* SECCIÓN SERVICIOS */}
          {seccionActiva === 'servicios' && (
             <div className="space-y-12 animate-in fade-in">
                <h3 className="text-4xl font-black text-white italic uppercase tracking-tighter">Servicios</h3>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {negocioActual.Servicio?.map((s: any) => (
                    <div key={s.id} className="bg-[#0f172a] p-8 rounded-[2rem] border border-white/5">
                      <p className="text-white font-black uppercase italic text-lg">{s.nombre}</p>
                      <p className="text-[#10b981] font-black text-2xl mt-2">${s.precio}</p>
                    </div>
                  ))}
                </div>
             </div>
          )}
        </div>
      </main>
    </div>
  )
}