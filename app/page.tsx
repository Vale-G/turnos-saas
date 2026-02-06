'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function Home() {
  const [negocios, setNegocios] = useState<any[]>([])
  const [negocioActual, setNegocioActual] = useState<any>(null)
  const [seccionActiva, setSeccionActiva] = useState<'agenda' | 'servicios' | 'admin' | 'analytics'>('agenda')
  const [rol, setRol] = useState<'superadmin' | 'admin' | 'peluquero' | 'cliente'>('superadmin')
  
  // Estados de formularios y filtros
  const [filtroFecha, setFiltroFecha] = useState(new Date().toISOString().split('T')[0])
  const [nuevoServicio, setNuevoServicio] = useState({ nombre: '', precio: '' })

  const cargarDatos = async () => {
    const { data, error } = await supabase.from('Negocio').select(`
        id, nombre, plan,
        Servicio (id, nombre, precio, duracion_minutos), 
        turnos (id, nombre_cliente, hora_inicio, estado, Servicio (nombre, precio, duracion_minutos))
      `)
    if (data) {
      setNegocios(data)
      setNegocioActual(prev => prev ? data.find((n: any) => n.id === prev.id) || data[0] : data[0])
    }
  }

  useEffect(() => { cargarDatos() }, [])

  // --- LÓGICA DE CÁLCULOS ---
  const turnosHoy = negocioActual?.turnos?.filter((t: any) => t.hora_inicio.includes(filtroFecha)) || []
  const recaudacionTotal = turnosHoy.filter((t: any) => t.estado === 'finalizado')
    .reduce((acc: number, t: any) => acc + (t.Servicio?.precio || 0), 0)

  if (!negocioActual) return <div className="min-h-screen bg-[#020617] flex items-center justify-center text-[#10b981] font-black animate-pulse">INICIANDO SISTEMA...</div>

  return (
    <div className="min-h-screen bg-[#020617] text-slate-300 flex">
      
      {/* SIDEBAR FIJA */}
      <aside className="w-64 border-r border-white/5 bg-[#020617] flex flex-col p-6 gap-8">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-[#10b981] rounded-lg flex items-center justify-center text-[#020617] font-black">V</div>
          <h1 className="font-black italic text-white text-lg tracking-tighter uppercase">Valentin</h1>
        </div>

        <nav className="flex flex-col gap-2 flex-1">
          {[
            { id: 'agenda', label: 'Agenda Diaria', icon: '📅' },
            { id: 'servicios', label: 'Mis Servicios', icon: '✂️' },
            { id: 'analytics', label: 'Estadísticas', icon: '📊' },
            { id: 'admin', label: 'SaaS Control', icon: '🛡️' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setSeccionActiva(item.id as any)}
              className={`flex items-center gap-3 p-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${seccionActiva === item.id ? 'bg-[#10b981] text-[#020617] shadow-[0_0_20px_rgba(16,185,129,0.2)]' : 'hover:bg-white/5 text-slate-500'}`}
            >
              <span>{item.icon}</span> {item.label}
            </button>
          ))}
        </nav>

        <div className="bg-[#0f172a] p-4 rounded-2xl border border-white/5">
          <p className="text-[8px] font-black text-slate-500 uppercase mb-2 text-center">Rol Actual</p>
          <div className="flex flex-wrap gap-1 justify-center">
            {['admin', 'peluquero', 'cliente'].map(r => (
              <button key={r} onClick={() => setRol(r as any)} className={`px-2 py-1 rounded text-[7px] font-black uppercase ${rol === r ? 'bg-white text-black' : 'text-slate-600'}`}>{r}</button>
            ))}
          </div>
        </div>
      </aside>

      {/* ÁREA DE CONTENIDO DINÁMICO */}
      <main className="flex-1 overflow-y-auto">
        {/* HEADER SUPERIOR */}
        <header className="p-8 border-b border-white/5 flex justify-between items-center bg-[#020617]/50 backdrop-blur-md sticky top-0 z-40">
          <div>
            <h2 className="text-2xl font-black text-white italic uppercase tracking-tighter">{negocioActual.nombre}</h2>
            <p className="text-[10px] text-[#10b981] font-black uppercase tracking-widest">Plan: {negocioActual.plan}</p>
          </div>
          <select 
            value={negocioActual.id}
            onChange={(e) => setNegocioActual(negocios.find(n => n.id === e.target.value))}
            className="bg-[#0f172a] border border-white/10 text-white text-[10px] font-black p-3 rounded-xl outline-none"
          >
            {negocios.map(n => <option key={n.id} value={n.id}>{n.nombre}</option>)}
          </select>
        </header>

        <div className="p-8">
          {/* SECCIÓN: AGENDA */}
          {seccionActiva === 'agenda' && (
            <div className="space-y-8 animate-in fade-in duration-500">
              <div className="flex justify-between items-end">
                <h3 className="text-4xl font-black text-white italic uppercase tracking-tighter">Agenda <span className="text-[#10b981]">Operativa</span></h3>
                <input type="date" value={filtroFecha} onChange={e => setFiltroFecha(e.target.value)} className="bg-[#0f172a] border border-white/10 p-3 rounded-xl text-white font-black text-xs" />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-4">
                  {turnosHoy.length > 0 ? turnosHoy.map((t: any) => (
                    <div key={t.id} className="bg-[#0f172a] border border-white/5 p-6 rounded-[2rem] flex justify-between items-center group hover:border-[#10b981]/30 transition-all">
                      <div className="flex items-center gap-6">
                        <div className="text-2xl font-black text-white/20 italic">#{new Date(t.hora_inicio).getHours()}:00</div>
                        <div>
                          <p className="font-black text-white text-xl uppercase italic tracking-tighter">{t.nombre_cliente}</p>
                          <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">{t.Servicio?.nombre} — <span className="text-[#10b981]">{t.estado}</span></p>
                        </div>
                      </div>
                      {rol !== 'cliente' && t.estado !== 'finalizado' && (
                        <button 
                          onClick={async () => {
                            const nuevoEstado = t.estado === 'pendiente' ? 'proceso' : 'finalizado';
                            await supabase.from('turnos').update({ estado: nuevoEstado }).eq('id', t.id);
                            cargarDatos();
                          }}
                          className="bg-[#10b981] text-[#020617] px-6 py-2 rounded-xl font-black text-[10px] uppercase hover:scale-105 transition-transform"
                        >
                          {t.estado === 'pendiente' ? 'Atender' : 'Cobrar'}
                        </button>
                      )}
                    </div>
                  )) : (
                    <div className="py-20 text-center border-2 border-dashed border-white/5 rounded-[3rem]">
                      <p className="text-slate-600 font-black uppercase tracking-[0.3em]">No hay turnos agendados</p>
                    </div>
                  )}
                </div>

                <aside className="bg-gradient-to-b from-[#0f172a] to-transparent p-8 rounded-[3rem] border border-white/5 h-fit">
                   <h4 className="text-white font-black uppercase italic mb-6">Resumen del Día</h4>
                   <div className="space-y-6">
                     <div>
                       <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Caja Cobrada</p>
                       <p className="text-4xl font-black text-[#10b981] italic">${recaudacionTotal}</p>
                     </div>
                     <div>
                       <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Turnos Totales</p>
                       <p className="text-4xl font-black text-white italic">{turnosHoy.length}</p>
                     </div>
                   </div>
                </aside>
              </div>
            </div>
          )}

          {/* SECCIÓN: SERVICIOS */}
          {seccionActiva === 'servicios' && (
            <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
              <h3 className="text-4xl font-black text-white italic uppercase tracking-tighter">Mis <span className="text-[#10b981]">Servicios</span></h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {negocioActual.Servicio?.map((s: any) => (
                  <div key={s.id} className="bg-[#0f172a] border border-white/5 p-8 rounded-[2.5rem] relative overflow-hidden group">
                    <div className="relative z-10">
                      <p className="text-2xl font-black text-white uppercase italic tracking-tighter mb-1">{s.nombre}</p>
                      <p className="text-[#10b981] font-black text-xl italic">${s.precio}</p>
                      <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mt-4">⏱️ {s.duracion_minutos} min</p>
                    </div>
                    <div className="absolute right-[-10%] bottom-[-10%] text-6xl opacity-5 group-hover:scale-110 transition-transform">✂️</div>
                  </div>
                ))}
                {/* Botón para agregar (solo admin) */}
                {rol === 'admin' && (
                  <button className="border-2 border-dashed border-[#10b981]/30 rounded-[2.5rem] flex flex-col items-center justify-center p-8 hover:bg-[#10b981]/5 transition-all gap-2">
                    <span className="text-3xl">+</span>
                    <span className="text-[10px] font-black uppercase tracking-widest">Nuevo Servicio</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* SECCIÓN: ANALYTICS (PROXIMAMENTE) */}
          {seccionActiva === 'analytics' && (
            <div className="py-20 text-center">
              <div className="text-6xl mb-6">📈</div>
              <h3 className="text-2xl font-black text-white uppercase italic">Métricas de Rendimiento</h3>
              <p className="text-slate-500 text-xs mt-2 uppercase tracking-[0.2em]">En desarrollo para el plan Premium</p>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}