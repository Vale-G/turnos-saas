// app/(publico)/reservar/[slug]/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Negocio, Servicio, Staff, Turno } from '@/types/database.types'
import CalendarioPublico from '@/components/booking/CalendarioPublico'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

interface PageProps {
  params: { slug: string }
}

export default function BookingPublico({ params }: PageProps) {
  const [negocio, setNegocio] = useState<Negocio | null>(null)
  const [servicios, setServicios] = useState<Servicio[]>([])
  const [staff, setStaff] = useState<Staff[]>([])
  const [turnos, setTurnos] = useState<Turno[]>([])
  const [loading, setLoading] = useState(true)
  
  // Estado del flujo de reserva
  const [paso, setPaso] = useState<1 | 2 | 3 | 4>(1)
  const [servicioSeleccionado, setServicioSeleccionado] = useState<Servicio | null>(null)
  const [staffSeleccionado, setStaffSeleccionado] = useState<Staff | null>(null)
  const [fechaHoraSeleccionada, setFechaHoraSeleccionada] = useState<{ fecha: Date; hora: string } | null>(null)
  const [datosCliente, setDatosCliente] = useState({ nombre: '', telefono: '', email: '', notas: '' })
  
  const [mensaje, setMensaje] = useState({ texto: '', tipo: '' as 'success' | 'error' | '' })

  useEffect(() => {
    cargarDatos()
  }, [params.slug])

  const cargarDatos = async () => {
    setLoading(true)

    // Cargar negocio por slug
    const { data: negocioData } = await supabase
      .from('Negocio')
      .select('*')
      .eq('slug', params.slug)
      .single()

    if (!negocioData) {
      alert('Negocio no encontrado')
      return
    }

    setNegocio(negocioData)

    // Cargar servicios activos
    const { data: serviciosData } = await supabase
      .from('Servicio')
      .select('*')
      .eq('negocio_id', negocioData.id)
      .eq('activo', true)
      .order('precio', { ascending: true })

    setServicios(serviciosData || [])

    // Cargar staff activo
    const { data: staffData } = await supabase
      .from('Staff')
      .select('*')
      .eq('negocio_id', negocioData.id)
      .eq('activo', true)

    setStaff(staffData || [])

    // Cargar turnos ocupados (próximos 30 días)
    const hoy = new Date()
    const treintaDias = new Date()
    treintaDias.setDate(hoy.getDate() + 30)

    const { data: turnosData } = await supabase
      .from('turnos')
      .select('*')
      .eq('negocio_id', negocioData.id)
      .gte('hora_inicio', hoy.toISOString())
      .lte('hora_inicio', treintaDias.toISOString())
      .in('estado', ['pendiente', 'confirmado'])

    setTurnos(turnosData || [])
    setLoading(false)
  }

  const seleccionarServicio = (servicio: Servicio) => {
    setServicioSeleccionado(servicio)
    setPaso(2)
  }

  const seleccionarStaff = (miembro: Staff) => {
    setStaffSeleccionado(miembro)
    setPaso(3)
  }

  const seleccionarFechaHora = (fecha: Date, hora: string) => {
    setFechaHoraSeleccionada({ fecha, hora })
    setPaso(4)
  }

  const confirmarReserva = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!fechaHoraSeleccionada || !servicioSeleccionado || !staffSeleccionado) return

    const [horas, minutos] = fechaHoraSeleccionada.hora.split(':')
    const fechaCompleta = new Date(fechaHoraSeleccionada.fecha)
    fechaCompleta.setHours(parseInt(horas), parseInt(minutos), 0, 0)

    const { error } = await supabase.from('turnos').insert([{
      negocio_id: negocio!.id,
      servicio_id: servicioSeleccionado.id,
      staff_id: staffSeleccionado.id,
      nombre_cliente: datosCliente.nombre,
      telefono_cliente: datosCliente.telefono,
      email_cliente: datosCliente.email,
      hora_inicio: fechaCompleta.toISOString(),
      estado: 'pendiente',
      notas_internas: datosCliente.notas
    }])

    if (error) {
      setMensaje({ texto: '❌ Error al reservar. Intenta nuevamente.', tipo: 'error' })
      return
    }

    // TODO: Enviar confirmación por WhatsApp/Email
    setMensaje({ texto: '🎉 ¡Reserva confirmada!', tipo: 'success' })
    
    // Resetear flujo
    setTimeout(() => {
      setPaso(1)
      setServicioSeleccionado(null)
      setStaffSeleccionado(null)
      setFechaHoraSeleccionada(null)
      setDatosCliente({ nombre: '', telefono: '', email: '', notas: '' })
      setMensaje({ texto: '', tipo: '' })
    }, 3000)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center">
        <div className="w-20 h-20 border-4 border-[#f59e0b]/20 border-t-[#f59e0b] rounded-full animate-spin" />
      </div>
    )
  }

  if (!negocio) {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center text-white">
        <div className="text-center">
          <h1 className="text-4xl font-black mb-4">404</h1>
          <p>Negocio no encontrado</p>
        </div>
      </div>
    )
  }

  const colorPrimario = negocio.color_primario || '#f59e0b'

  return (
    <div className="min-h-screen bg-[#020617] text-slate-300">
      
      {/* Header */}
      <header className="border-b border-white/5 bg-[#0f172a]/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            {negocio.logo_url ? (
              <img src={negocio.logo_url} alt={negocio.nombre} className="w-16 h-16 rounded-2xl" />
            ) : (
              <div 
                className="w-16 h-16 rounded-2xl flex items-center justify-center text-black font-black text-3xl"
                style={{ backgroundColor: colorPrimario }}
              >
                {negocio.nombre.charAt(0)}
              </div>
            )}
            <div>
              <h1 className="text-3xl font-black text-white italic uppercase tracking-tighter">
                {negocio.nombre}
              </h1>
              <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mt-1">
                Reserva tu turno online
              </p>
            </div>
          </div>

          {/* Indicador de paso */}
          <div className="flex items-center gap-3">
            {[1, 2, 3, 4].map((num) => (
              <div
                key={num}
                className={`w-3 h-3 rounded-full transition-all ${
                  num === paso 
                    ? 'w-8' 
                    : num < paso 
                      ? 'opacity-50' 
                      : 'opacity-20'
                }`}
                style={{ backgroundColor: num <= paso ? colorPrimario : '#475569' }}
              />
            ))}
          </div>
        </div>
      </header>

      {/* Contenido Principal */}
      <main className="max-w-7xl mx-auto px-6 py-12">
        
        {/* Mensaje de éxito/error */}
        {mensaje.texto && (
          <div className={`mb-8 p-6 rounded-[2rem] text-center font-black text-lg ${
            mensaje.tipo === 'success' 
              ? 'bg-green-500/20 text-green-300' 
              : 'bg-red-500/20 text-red-300'
          }`}>
            {mensaje.texto}
          </div>
        )}

        {/* PASO 1: Seleccionar Servicio */}
        {paso === 1 && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
            <h2 className="text-5xl font-black text-white italic uppercase tracking-tighter">
              Selecciona un <span style={{ color: colorPrimario }}>{negocio.label_servicio}</span>
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {servicios.map((servicio) => (
                <button
                  key={servicio.id}
                  onClick={() => seleccionarServicio(servicio)}
                  className="bg-[#0f172a] p-8 rounded-[3rem] border border-white/5 hover:border-white/20 transition-all text-left group hover:scale-105"
                >
                  <h3 className="text-2xl font-black text-white uppercase italic tracking-tighter">
                    {servicio.nombre}
                  </h3>
                  {servicio.descripcion && (
                    <p className="text-sm text-slate-400 mt-2">{servicio.descripcion}</p>
                  )}
                  <div className="flex items-center justify-between mt-6 pt-6 border-t border-white/5">
                    {!servicio.ocultar_precio && (
                      <p className="text-3xl font-black italic" style={{ color: colorPrimario }}>
                        ${servicio.precio}
                      </p>
                    )}
                    <p className="text-xs text-slate-500 font-bold">
                      {servicio.duracion_minutos} min
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* PASO 2: Seleccionar Profesional */}
        {paso === 2 && servicioSeleccionado && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setPaso(1)}
                className="w-12 h-12 rounded-2xl bg-white/5 hover:bg-white/10 flex items-center justify-center"
              >
                ←
              </button>
              <h2 className="text-5xl font-black text-white italic uppercase tracking-tighter">
                Elige tu <span style={{ color: colorPrimario }}>{negocio.label_staff}</span>
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {staff.map((miembro) => (
                <button
                  key={miembro.id}
                  onClick={() => seleccionarStaff(miembro)}
                  className="bg-[#0f172a] p-8 rounded-[3rem] border border-white/5 hover:border-white/20 transition-all text-center group hover:scale-105"
                >
                  <div 
                    className="w-24 h-24 rounded-full mx-auto mb-6 flex items-center justify-center text-4xl"
                    style={{ backgroundColor: `${colorPrimario}20` }}
                  >
                    {miembro.avatar_url ? (
                      <img src={miembro.avatar_url} className="w-full h-full rounded-full object-cover" />
                    ) : (
                      '👤'
                    )}
                  </div>
                  <h3 className="text-xl font-black text-white uppercase italic tracking-tighter">
                    {miembro.nombre}
                  </h3>
                  {miembro.especialidad && (
                    <p className="text-xs text-slate-500 font-bold mt-2">{miembro.especialidad}</p>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* PASO 3: Seleccionar Fecha y Hora */}
        {paso === 3 && staffSeleccionado && servicioSeleccionado && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setPaso(2)}
                className="w-12 h-12 rounded-2xl bg-white/5 hover:bg-white/10 flex items-center justify-center"
              >
                ←
              </button>
              <h2 className="text-5xl font-black text-white italic uppercase tracking-tighter">
                Fecha y <span style={{ color: colorPrimario }}>Horario</span>
              </h2>
            </div>

            <CalendarioPublico
              servicioSeleccionado={servicioSeleccionado}
              staffSeleccionado={staffSeleccionado}
              horariosOcupados={turnos
                .filter(t => t.staff_id === staffSeleccionado.id)
                .map(t => t.hora_inicio)
              }
              onSeleccionarFecha={seleccionarFechaHora}
              colorPrimario={colorPrimario}
            />
          </div>
        )}

        {/* PASO 4: Confirmar Datos */}
        {paso === 4 && fechaHoraSeleccionada && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setPaso(3)}
                className="w-12 h-12 rounded-2xl bg-white/5 hover:bg-white/10 flex items-center justify-center"
              >
                ←
              </button>
              <h2 className="text-5xl font-black text-white italic uppercase tracking-tighter">
                Tus <span style={{ color: colorPrimario }}>Datos</span>
              </h2>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              
              {/* Resumen */}
              <div className="bg-[#0f172a] p-10 rounded-[3rem] border border-white/5 space-y-6">
                <h3 className="text-2xl font-black text-white uppercase italic">Resumen</h3>
                
                <div className="space-y-4">
                  <div className="pb-4 border-b border-white/5">
                    <p className="text-[10px] font-black text-slate-500 uppercase">Servicio</p>
                    <p className="text-xl font-black text-white mt-1">{servicioSeleccionado?.nombre}</p>
                  </div>
                  
                  <div className="pb-4 border-b border-white/5">
                    <p className="text-[10px] font-black text-slate-500 uppercase">{negocio.label_staff}</p>
                    <p className="text-xl font-black text-white mt-1">{staffSeleccionado?.nombre}</p>
                  </div>
                  
                  <div className="pb-4 border-b border-white/5">
                    <p className="text-[10px] font-black text-slate-500 uppercase">Fecha y Hora</p>
                    <p className="text-xl font-black text-white mt-1">
                      {format(fechaHoraSeleccionada.fecha, "EEEE d 'de' MMMM", { locale: es })}
                    </p>
                    <p className="text-lg font-black mt-1" style={{ color: colorPrimario }}>
                      {fechaHoraSeleccionada.hora} hs
                    </p>
                  </div>
                  
                  {!servicioSeleccionado?.ocultar_precio && (
                    <div>
                      <p className="text-[10px] font-black text-slate-500 uppercase">Total</p>
                      <p className="text-4xl font-black text-white mt-1">${servicioSeleccionado?.precio}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Formulario */}
              <form onSubmit={confirmarReserva} className="bg-[#0f172a] p-10 rounded-[3rem] border border-white/5 space-y-6">
                <input
                  type="text"
                  placeholder="Nombre completo"
                  value={datosCliente.nombre}
                  onChange={(e) => setDatosCliente({ ...datosCliente, nombre: e.target.value })}
                  className="w-full bg-[#020617] border border-white/10 p-5 rounded-2xl text-white outline-none focus:border-white/30"
                  required
                />
                
                <input
                  type="tel"
                  placeholder="Teléfono"
                  value={datosCliente.telefono}
                  onChange={(e) => setDatosCliente({ ...datosCliente, telefono: e.target.value })}
                  className="w-full bg-[#020617] border border-white/10 p-5 rounded-2xl text-white outline-none focus:border-white/30"
                  required
                />
                
                <input
                  type="email"
                  placeholder="Email (opcional)"
                  value={datosCliente.email}
                  onChange={(e) => setDatosCliente({ ...datosCliente, email: e.target.value })}
                  className="w-full bg-[#020617] border border-white/10 p-5 rounded-2xl text-white outline-none focus:border-white/30"
                />
                
                <textarea
                  placeholder="Notas adicionales (opcional)"
                  value={datosCliente.notas}
                  onChange={(e) => setDatosCliente({ ...datosCliente, notas: e.target.value })}
                  className="w-full bg-[#020617] border border-white/10 p-5 rounded-2xl text-white outline-none focus:border-white/30 h-24 resize-none"
                />
                
                <button
                  type="submit"
                  className="w-full py-6 rounded-[2rem] text-black font-black uppercase text-lg tracking-wider shadow-2xl hover:scale-105 transition-transform"
                  style={{ backgroundColor: colorPrimario }}
                >
                  Confirmar Reserva
                </button>
              </form>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 mt-20">
        <div className="max-w-7xl mx-auto px-6 py-8 text-center">
          <p className="text-xs text-slate-600 font-bold">
            Powered by <span className="text-slate-400">TuPlataforma</span> • Sistema de Gestión de Turnos
          </p>
        </div>
      </footer>
    </div>
  )
}
