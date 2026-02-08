// app/(owner)/dashboard/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Negocio, Servicio, Staff, Turno, Egreso, RolUsuario, FormTurno, FormServicio, FormStaff, FormEgreso, Message } from '@/types/database.types'
import { usePuede, usePlanFeatures, calcularDiasRestantesTrial } from '@/lib/permisos'
import CalendarioSemanal from '@/components/dashboard/CalendarioSemanal'
import UpgradePlanModal from '@/components/dashboard/UpgradePlanModal'

type SeccionActiva = 'agenda' | 'servicios' | 'staff' | 'clientes' | 'finanzas' | 'configuracion'

export default function DashboardOwner() {
  const [negocio, setNegocio] = useState<Negocio | null>(null)
  const [rol] = useState<RolUsuario>('owner') // TODO: Obtener del auth real
  const [seccionActiva, setSeccionActiva] = useState<SeccionActiva>('agenda')
  const [loading, setLoading] = useState(true)

  const [servicios, setServicios] = useState<Servicio[]>([])
  const [staff, setStaff] = useState<Staff[]>([])
  const [turnos, setTurnos] = useState<Turno[]>([])
  const [egresos, setEgresos] = useState<Egreso[]>([])

  const [formTurno, setFormTurno] = useState<FormTurno>({
    cliente: '', telefono: '', email: '', servicio: '', staff: '', fecha: '', notas: ''
  })
  const [formServicio, setFormServicio] = useState<FormServicio>({
    nombre: '', descripcion: '', precio: '', duracion: '', ocultar_precio: false
  })
  const [formStaff, setFormStaff] = useState<FormStaff>({
    nombre: '', especialidad: '', horario_inicio: '09:00', horario_fin: '18:00', dias_trabajo: ['L', 'Ma', 'Mi', 'J', 'V']
  })
  const [formEgreso, setFormEgreso] = useState<FormEgreso>({
    categoria: 'otro', descripcion: '', monto: '', fecha: new Date().toISOString().split('T')[0]
  })

  const [filtroFecha, setFiltroFecha] = useState(new Date().toISOString().split('T')[0])
  const [mensaje, setMensaje] = useState<Message>({ texto: '', tipo: 'info' })
  const [modalUpgrade, setModalUpgrade] = useState<{ abierto: boolean; feature: string }>({ abierto: false, feature: '' })
  const [modalTurno, setModalTurno] = useState<{ abierto: boolean; turno: Turno | null }>({ abierto: false, turno: null })

  useEffect(() => {
    cargarDatos()
  }, [])

  const cargarDatos = async () => {
    setLoading(true)
    
    // TODO: Obtener negocio del usuario autenticado
    // Por ahora simulamos con el primero disponible
    const { data: negocioData } = await supabase
      .from('Negocio')
      .select('*')
      .limit(1)
      .single()

    if (negocioData) {
      setNegocio(negocioData)

      // Cargar datos relacionados
      const [serviciosRes, staffRes, turnosRes, egresosRes] = await Promise.all([
        supabase.from('Servicio').select('*').eq('negocio_id', negocioData.id).eq('activo', true),
        supabase.from('Staff').select('*').eq('negocio_id', negocioData.id),
        supabase.from('turnos').select('*, Servicio(*), Staff(*)').eq('negocio_id', negocioData.id).gte('hora_inicio', new Date().toISOString()),
        supabase.from('Egresos').select('*').eq('negocio_id', negocioData.id)
      ])

      setServicios(serviciosRes.data || [])
      setStaff(staffRes.data || [])
      setTurnos(turnosRes.data || [])
      setEgresos(egresosRes.data || [])
    }

    setTimeout(() => setLoading(false), 500)
  }

  const notify = (texto: string, tipo: Message['tipo']) => {
    setMensaje({ texto, tipo })
    setTimeout(() => setMensaje({ texto: '', tipo: 'info' }), 4000)
  }

  const verificarAccesoFeature = (seccion: SeccionActiva): boolean => {
    if (!negocio) return false
    const features = usePlanFeatures(negocio.plan)
    
    if (seccion === 'clientes' && !features.canAccessCRM) {
      setModalUpgrade({ abierto: true, feature: 'CRM de Clientes' })
      return false
    }
    
    if (seccion === 'finanzas' && !features.canAccessFinanzas) {
      setModalUpgrade({ abierto: true, feature: 'Reportes Financieros' })
      return false
    }
    
    return true
  }

  const cambiarSeccion = (seccion: SeccionActiva) => {
    if (verificarAccesoFeature(seccion)) {
      setSeccionActiva(seccion)
    }
  }

  const handleCrearTurno = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!negocio) return

    // Validaciones
    if (!formTurno.cliente.trim()) {
      return notify('⚠️ El nombre del cliente es requerido', 'error')
    }

    const isoFecha = new Date(formTurno.fecha).toISOString()
    
    // Verificar conflicto
    const conflicto = turnos.find(t => 
      t.staff_id === formTurno.staff && 
      t.hora_inicio === isoFecha && 
      t.estado !== 'finalizado' &&
      t.estado !== 'cancelado'
    )

    if (conflicto) {
      return notify('⚠️ El profesional ya tiene un turno a esa hora', 'error')
    }

    const { error } = await supabase.from('turnos').insert([{
      negocio_id: negocio.id,
      nombre_cliente: formTurno.cliente,
      telefono_cliente: formTurno.telefono || null,
      email_cliente: formTurno.email || null,
      servicio_id: formTurno.servicio,
      staff_id: formTurno.staff,
      hora_inicio: isoFecha,
      estado: 'pendiente',
      notas_internas: formTurno.notas || null
    }])

    if (error) {
      notify(`❌ Error: ${error.message}`, 'error')
      return
    }

    setFormTurno({ cliente: '', telefono: '', email: '', servicio: '', staff: '', fecha: '', notas: '' })
    notify('🚀 Turno agendado con éxito', 'success')
    cargarDatos()
  }

  const handleCrearServicio = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!negocio) return

    const precio = parseFloat(formServicio.precio)
    const duracion = parseInt(formServicio.duracion)

    if (isNaN(precio) || precio <= 0) {
      return notify('⚠️ El precio debe ser mayor a 0', 'error')
    }

    if (isNaN(duracion) || duracion <= 0) {
      return notify('⚠️ La duración debe ser mayor a 0', 'error')
    }

    const { error } = await supabase.from('Servicio').insert([{
      negocio_id: negocio.id,
      nombre: formServicio.nombre,
      descripcion: formServicio.descripcion || null,
      precio,
      duracion_minutos: duracion,
      ocultar_precio: formServicio.ocultar_precio
    }])

    if (error) {
      notify(`❌ Error: ${error.message}`, 'error')
      return
    }

    setFormServicio({ nombre: '', descripcion: '', precio: '', duracion: '', ocultar_precio: false })
    notify('✅ Servicio creado', 'success')
    cargarDatos()
  }

  const handleCrearStaff = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!negocio) return

    const { error } = await supabase.from('Staff').insert([{
      negocio_id: negocio.id,
      nombre: formStaff.nombre,
      especialidad: formStaff.especialidad || null,
      horario_inicio: formStaff.horario_inicio,
      horario_fin: formStaff.horario_fin,
      dias_trabajo: formStaff.dias_trabajo
    }])

    if (error) {
      notify(`❌ Error: ${error.message}`, 'error')
      return
    }

    setFormStaff({ nombre: '', especialidad: '', horario_inicio: '09:00', horario_fin: '18:00', dias_trabajo: ['L', 'Ma', 'Mi', 'J', 'V'] })
    notify('👤 Staff vinculado', 'success')
    cargarDatos()
  }

  const handleCrearEgreso = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!negocio) return

    const monto = parseFloat(formEgreso.monto)
    if (isNaN(monto) || monto <= 0) {
      return notify('⚠️ El monto debe ser mayor a 0', 'error')
    }

    const { error } = await supabase.from('Egresos').insert([{
      negocio_id: negocio.id,
      categoria: formEgreso.categoria,
      descripcion: formEgreso.descripcion,
      monto,
      fecha: formEgreso.fecha
    }])

    if (error) {
      notify(`❌ Error: ${error.message}`, 'error')
      return
    }

    setFormEgreso({ categoria: 'otro', descripcion: '', monto: '', fecha: new Date().toISOString().split('T')[0] })
    notify('💰 Gasto registrado', 'success')
    cargarDatos()
  }

  const handleUpgrade = async (nuevoPlan: 'basico' | 'pro') => {
    if (!negocio) return
    
    // TODO: Integrar Mercado Pago
    alert(`Redirigiendo a pago de ${nuevoPlan}...`)
    setModalUpgrade({ abierto: false, feature: '' })
  }

  const turnosHoy = turnos.filter(t => t.hora_inicio.includes(filtroFecha))
  const ingresosBrutos = turnosHoy.filter(t => t.estado === 'finalizado').reduce((sum, t) => sum + (t.Servicio?.precio || 0), 0)
  const egresosHoy = egresos.filter(e => e.fecha === filtroFecha).reduce((sum, e) => sum + e.monto, 0)
  const gananciaNeta = ingresosBrutos - egresosHoy

  const getTopClientes = () => {
    const mapa = new Map<string, { visitas: number; total: number }>()
    turnos.forEach(t => {
      const actual = mapa.get(t.nombre_cliente) || { visitas: 0, total: 0 }
      actual.visitas += 1
      if (t.estado === 'finalizado') actual.total += t.Servicio?.precio || 0
      mapa.set(t.nombre_cliente, actual)
    })
    return Array.from(mapa.entries())
      .sort((a, b) => b[1].total - a[1].total)
      .slice(0, 6)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center gap-6">
        <div className="w-20 h-20 border-4 border-[#10b981]/10 border-t-[#10b981] rounded-full animate-spin" />
        <h2 className="text-[#10b981] font-black text-2xl uppercase tracking-[0.4em] animate-pulse">
          Cargando Plataforma
        </h2>
      </div>
    )
  }

  if (!negocio) {
    return <div className="min-h-screen bg-[#020617] text-white flex items-center justify-center">Error: No hay negocio asignado</div>
  }
  // --- Lógica de Protección (Insertar antes del return) ---
  // Si 'negocio' es null o undefined, mostramos la carga para evitar el error de 'secciones_disponibles'
  // --- PROTECCIÓN DE CARGA ---
  if (loading || !negocio) {
    return (
      <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center">
        <div className="w-16 h-16 border-4 border-[#10b981]/10 border-t-[#10b981] rounded-full animate-spin mb-6" />
        <div className="text-[#10b981] font-black tracking-[0.3em] animate-pulse uppercase text-xs">
          Accediendo a la Plataforma
        </div>
      </div>
    );
  }

  // --- VARIABLES SEGURAS ---
 // --- VARIABLES SEGURAS (Con red de seguridad '?' y valores por defecto) ---
  const colorPrimario = negocio?.color_primario || '#10b981';
  const planActual = negocio?.plan || 'trial';
  const features = usePlanFeatures(planActual);
  
  const diasTrial = (negocio?.plan === 'trial' && negocio?.trial_ends_at) 
    ? Math.max(0, Math.floor((new Date(negocio.trial_ends_at).getTime() - new Date().getTime()) / (1000 * 3600 * 24)))
    : 0;
  return (
    <div className="min-h-screen bg-[#020617] text-slate-300 flex font-sans">
      
      {/* Sidebar */}
      <aside className="w-80 border-r border-white/5 bg-[#020617] flex flex-col p-10 gap-10 sticky top-0 h-screen overflow-y-auto">
        
        {/* Logo */}
        <div className="flex items-center gap-4">
          <div 
            className="w-12 h-12 rounded-2xl flex items-center justify-center text-black font-black text-3xl shadow-[0_0_30px_rgba(16,185,129,0.3)]"
            style={{ background: `linear-gradient(to bottom right, ${colorPrimario}, ${colorPrimario}dd)` }}
          >
            {negocio.nombre.charAt(0)}
          </div>
          <div>
            <h1 className="font-black italic text-white text-xl tracking-tighter uppercase leading-none">
              {negocio.nombre}
            </h1>
            <p className="text-[10px] text-slate-600 font-bold uppercase tracking-wider mt-1">
              {negocio.vertical}
            </p>
          </div>
        </div>

        {/* Trial Warning */}
        {negocio.plan === 'trial' && diasTrial <= 3 && (
          <div className="bg-yellow-500/10 border border-yellow-500/30 p-4 rounded-2xl">
            <p className="text-yellow-300 text-xs font-black uppercase text-center">
              ⏰ {diasTrial} días de prueba restantes
            </p>
            <button 
              onClick={() => setModalUpgrade({ abierto: true, feature: 'Plan Completo' })}
              className="w-full mt-3 bg-yellow-500 text-black py-2 rounded-xl text-[10px] font-black uppercase hover:scale-105 transition-transform"
            >
              Actualizar Plan
            </button>
          </div>
        )}

        {/* Navegación */}
        <nav className="flex flex-col gap-2 flex-1">
          {[
            { id: 'agenda', label: 'Agenda', icon: '🗓️' },
            { id: 'servicios', label: negocio.label_servicio + 's', icon: '✂️' },
            { id: 'staff', label: negocio.label_staff + 's', icon: '👥' },
            { id: 'clientes', label: 'CRM', icon: '💎', premium: !features.canAccessCRM },
            { id: 'finanzas', label: 'Finanzas', icon: '💰', premium: !features.canAccessFinanzas },
            { id: 'configuracion', label: 'Config', icon: '⚙️' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => cambiarSeccion(item.id as SeccionActiva)}
              className={`flex items-center gap-4 p-5 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest transition-all relative ${
                seccionActiva === item.id 
                  ? `text-black shadow-xl` 
                  : 'hover:bg-white/5 text-slate-500'
              }`}
              style={seccionActiva === item.id ? { backgroundColor: colorPrimario } : {}}
            >
              <span className="text-xl">{item.icon}</span>
              {item.label}
              {item.premium && (
                <span className="ml-auto text-yellow-500 text-lg">🔒</span>
              )}
            </button>
          ))}
        </nav>

        {/* Notificaciones */}
        {mensaje.texto && (
          <div className={`p-4 rounded-2xl text-[10px] font-black uppercase text-center ${
            mensaje.tipo === 'success' ? 'bg-[#10b981]/20 text-[#10b981]' :
            mensaje.tipo === 'error' ? 'bg-red-500/20 text-red-500' :
            mensaje.tipo === 'warning' ? 'bg-yellow-500/20 text-yellow-500' :
            'bg-blue-500/20 text-blue-500'
          }`}>
            {mensaje.texto}
          </div>
        )}
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-12 overflow-y-auto">
        
        {/* AGENDA */}
        {seccionActiva === 'agenda' && (
          <div className="space-y-12">
            <div className="flex items-center justify-between">
              <h2 className="text-5xl font-black text-white italic uppercase tracking-tighter">
                Agenda <span style={{ color: colorPrimario }}>Semanal</span>
              </h2>
              <div className="flex items-center gap-4">
                <input
                  type="date"
                  value={filtroFecha}
                  onChange={(e) => setFiltroFecha(e.target.value)}
                  className="bg-[#0f172a] border border-white/5 px-6 py-3 rounded-2xl text-white text-sm outline-none"
                />
              </div>
            </div>

            <CalendarioSemanal
              turnos={turnos}
              staff={staff.filter(s => s.activo)}
              onTurnoClick={(turno) => setModalTurno({ abierto: true, turno })}
              onSlotClick={(fecha, staffId) => {
                const fechaStr = fecha.toISOString().slice(0, 16)
                setFormTurno({ ...formTurno, fecha: fechaStr, staff: staffId })
              }}
              colorPrimario={colorPrimario}
            />

            {/* Form crear turno */}
            <div className="bg-[#0f172a] p-10 rounded-[3rem] border border-white/5">
              <h3 className="text-2xl font-black text-white italic uppercase mb-6">Nuevo Turno</h3>
              <form onSubmit={handleCrearTurno} className="grid grid-cols-2 gap-4">
                <input
                  type="text"
                  placeholder="Nombre del cliente"
                  value={formTurno.cliente}
                  onChange={(e) => setFormTurno({ ...formTurno, cliente: e.target.value })}
                  className="bg-[#020617] border border-white/5 p-5 rounded-2xl text-white text-sm outline-none"
                  required
                />
                <input
                  type="tel"
                  placeholder="Teléfono"
                  value={formTurno.telefono}
                  onChange={(e) => setFormTurno({ ...formTurno, telefono: e.target.value })}
                  className="bg-[#020617] border border-white/5 p-5 rounded-2xl text-white text-sm outline-none"
                />
                <select
                  value={formTurno.servicio}
                  onChange={(e) => setFormTurno({ ...formTurno, servicio: e.target.value })}
                  className="bg-[#020617] border border-white/5 p-5 rounded-2xl text-white text-sm outline-none"
                  required
                >
                  <option value="">Seleccionar servicio</option>
                  {servicios.map(s => <option key={s.id} value={s.id}>{s.nombre} - ${s.precio}</option>)}
                </select>
                <select
                  value={formTurno.staff}
                  onChange={(e) => setFormTurno({ ...formTurno, staff: e.target.value })}
                  className="bg-[#020617] border border-white/5 p-5 rounded-2xl text-white text-sm outline-none"
                  required
                >
                  <option value="">Seleccionar profesional</option>
                  {staff.filter(s => s.activo).map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                </select>
                <input
                  type="datetime-local"
                  value={formTurno.fecha}
                  onChange={(e) => setFormTurno({ ...formTurno, fecha: e.target.value })}
                  className="bg-[#020617] border border-white/5 p-5 rounded-2xl text-white text-sm outline-none"
                  required
                />
                <button 
                  type="submit" 
                  className="col-span-2 text-black font-black py-5 rounded-2xl uppercase text-sm tracking-widest shadow-xl hover:scale-105 transition-transform"
                  style={{ backgroundColor: colorPrimario }}
                >
                  Agendar Turno
                </button>
              </form>
            </div>

            {/* Caja del día */}
            <div className="p-12 rounded-[3.5rem] text-[#020617] shadow-2xl" style={{ backgroundColor: colorPrimario }}>
              <p className="text-[11px] font-black uppercase tracking-widest opacity-60">Ingresos Hoy</p>
              <p className="text-7xl font-black italic tracking-tighter my-4">${ingresosBrutos}</p>
              <p className="text-xs font-bold opacity-60">{turnosHoy.filter(t => t.estado === 'finalizado').length} turnos finalizados</p>
            </div>
          </div>
        )}

        {/* SERVICIOS */}
        {seccionActiva === 'servicios' && (
          <div className="space-y-12">
            <h2 className="text-5xl font-black text-white italic uppercase tracking-tighter">
              Catálogo de <span style={{ color: colorPrimario }}>{negocio.label_servicio}s</span>
            </h2>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {servicios.map(s => (
                <div key={s.id} className="bg-[#0f172a] p-12 rounded-[4rem] border border-white/5">
                  <p className="text-white font-black uppercase italic text-3xl tracking-tighter">{s.nombre}</p>
                  {s.descripcion && <p className="text-slate-400 text-sm mt-2">{s.descripcion}</p>}
                  <div className="flex items-baseline gap-2 mt-6">
                    <p className="text-5xl font-black italic" style={{ color: colorPrimario }}>${s.precio}</p>
                    <span className="text-slate-600 text-sm">• {s.duracion_minutos}min</span>
                  </div>
                </div>
              ))}
            </div>

            {usePuede(rol, 'servicios', 'create') && (
              <div className="bg-[#020617] border border-white/5 p-10 rounded-[3.5rem]">
                <h4 className="text-white font-black uppercase italic mb-8">Nuevo Servicio</h4>
                <form onSubmit={handleCrearServicio} className="grid grid-cols-2 gap-4">
                  <input type="text" placeholder="Nombre" value={formServicio.nombre} onChange={e => setFormServicio({ ...formServicio, nombre: e.target.value })} className="bg-[#0f172a] border border-white/5 p-5 rounded-2xl text-white text-sm" required />
                  <input type="text" placeholder="Descripción" value={formServicio.descripcion} onChange={e => setFormServicio({ ...formServicio, descripcion: e.target.value })} className="bg-[#0f172a] border border-white/5 p-5 rounded-2xl text-white text-sm" />
                  <input type="number" placeholder="Precio" value={formServicio.precio} onChange={e => setFormServicio({ ...formServicio, precio: e.target.value })} className="bg-[#0f172a] border border-white/5 p-5 rounded-2xl text-white text-sm" required />
                  <input type="number" placeholder="Duración (min)" value={formServicio.duracion} onChange={e => setFormServicio({ ...formServicio, duracion: e.target.value })} className="bg-[#0f172a] border border-white/5 p-5 rounded-2xl text-white text-sm" required />
                  <label className="flex items-center gap-3 col-span-2 text-sm text-slate-400">
                    <input type="checkbox" checked={formServicio.ocultar_precio} onChange={e => setFormServicio({ ...formServicio, ocultar_precio: e.target.checked })} className="w-5 h-5" />
                    Ocultar precio en reservas públicas
                  </label>
                  <button type="submit" className="col-span-2 text-black font-black py-5 rounded-2xl uppercase text-sm" style={{ backgroundColor: colorPrimario }}>Crear Servicio</button>
                </form>
              </div>
            )}
          </div>
        )}

        {/* STAFF */}
        {seccionActiva === 'staff' && (
          <div className="space-y-12">
            <h2 className="text-5xl font-black text-white italic uppercase tracking-tighter">
              Equipo de <span style={{ color: colorPrimario }}>{negocio.label_staff}s</span>
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
              {staff.map(s => (
                <div key={s.id} className="bg-[#0f172a] p-12 rounded-[4rem] border border-white/5 text-center">
                  <div className="w-24 h-24 rounded-full flex items-center justify-center text-4xl mx-auto mb-8" style={{ backgroundColor: `${colorPrimario}20` }}>
                    👤
                  </div>
                  <p className="text-white font-black uppercase italic text-2xl tracking-tighter">{s.nombre}</p>
                  {s.especialidad && <p className="text-slate-400 text-xs mt-2">{s.especialidad}</p>}
                  <p className="text-[10px] font-black uppercase mt-4 tracking-widest" style={{ color: s.activo ? colorPrimario : '#ef4444' }}>
                    {s.activo ? 'Activo' : 'Inactivo'}
                  </p>
                </div>
              ))}
            </div>

            {usePuede(rol, 'staff', 'create') && (
              <div className="bg-[#020617] border border-white/5 p-10 rounded-[3.5rem]">
                <h4 className="text-white font-black uppercase italic mb-8">Nuevo Miembro</h4>
                <form onSubmit={handleCrearStaff} className="grid grid-cols-2 gap-4">
                  <input type="text" placeholder="Nombre completo" value={formStaff.nombre} onChange={e => setFormStaff({ ...formStaff, nombre: e.target.value })} className="bg-[#0f172a] border border-white/5 p-5 rounded-2xl text-white text-sm" required />
                  <input type="text" placeholder="Especialidad" value={formStaff.especialidad} onChange={e => setFormStaff({ ...formStaff, especialidad: e.target.value })} className="bg-[#0f172a] border border-white/5 p-5 rounded-2xl text-white text-sm" />
                  <button type="submit" className="col-span-2 text-black font-black py-5 rounded-2xl uppercase text-sm" style={{ backgroundColor: colorPrimario }}>Agregar al Equipo</button>
                </form>
              </div>
            )}
          </div>
        )}

        {/* CLIENTES (CRM) */}
        {seccionActiva === 'clientes' && (
          <div className="space-y-12">
            <h2 className="text-5xl font-black text-white italic uppercase tracking-tighter">
              Top <span style={{ color: colorPrimario }}>Clientes</span>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {getTopClientes().map(([nombre, datos]) => (
                <div key={nombre} className="bg-[#0f172a] p-10 rounded-[4rem] border border-white/5">
                  <div className="w-16 h-16 rounded-full flex items-center justify-center text-3xl mb-8" style={{ backgroundColor: `${colorPrimario}20` }}>
                    👤
                  </div>
                  <p className="text-3xl font-black text-white uppercase italic tracking-tighter">{nombre}</p>
                  <div className="grid grid-cols-2 gap-6 mt-10 pt-8 border-t border-white/5">
                    <div>
                      <p className="text-[10px] text-slate-500 uppercase">Visitas</p>
                      <p className="text-2xl font-black italic" style={{ color: colorPrimario }}>{datos.visitas}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-500 uppercase">Total</p>
                      <p className="text-2xl font-black text-white italic">${datos.total}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* FINANZAS */}
        {seccionActiva === 'finanzas' && (
          <div className="space-y-12">
            <h2 className="text-5xl font-black text-white italic uppercase tracking-tighter">
              Dashboard <span style={{ color: colorPrimario }}>Financiero</span>
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="bg-[#0f172a] p-12 rounded-[4rem] border border-white/5">
                <p className="text-[10px] font-black text-slate-500 uppercase">Ingresos Brutos</p>
                <p className="text-6xl font-black text-white italic mt-4">${ingresosBrutos}</p>
              </div>
              <div className="bg-[#0f172a] p-12 rounded-[4rem] border border-white/5">
                <p className="text-[10px] font-black text-slate-500 uppercase">Egresos</p>
                <p className="text-6xl font-black text-red-400 italic mt-4">${egresosHoy}</p>
              </div>
              <div className="p-12 rounded-[4rem]" style={{ backgroundColor: colorPrimario }}>
                <p className="text-[10px] font-black uppercase opacity-60">Ganancia Neta</p>
                <p className="text-6xl font-black text-[#020617] italic mt-4">${gananciaNeta}</p>
              </div>
            </div>

            {/* Form agregar egreso */}
            <div className="bg-[#020617] border border-white/5 p-10 rounded-[3.5rem]">
              <h4 className="text-white font-black uppercase italic mb-8">Registrar Gasto</h4>
              <form onSubmit={handleCrearEgreso} className="grid grid-cols-2 gap-4">
                <select value={formEgreso.categoria} onChange={e => setFormEgreso({ ...formEgreso, categoria: e.target.value as any })} className="bg-[#0f172a] border border-white/5 p-5 rounded-2xl text-white text-sm" required>
                  <option value="alquiler">Alquiler</option>
                  <option value="luz">Luz</option>
                  <option value="agua">Agua</option>
                  <option value="productos">Productos</option>
                  <option value="sueldos">Sueldos</option>
                  <option value="impuestos">Impuestos</option>
                  <option value="otro">Otro</option>
                </select>
                <input type="text" placeholder="Descripción" value={formEgreso.descripcion} onChange={e => setFormEgreso({ ...formEgreso, descripcion: e.target.value })} className="bg-[#0f172a] border border-white/5 p-5 rounded-2xl text-white text-sm" required />
                <input type="number" placeholder="Monto" value={formEgreso.monto} onChange={e => setFormEgreso({ ...formEgreso, monto: e.target.value })} className="bg-[#0f172a] border border-white/5 p-5 rounded-2xl text-white text-sm" required />
                <input type="date" value={formEgreso.fecha} onChange={e => setFormEgreso({ ...formEgreso, fecha: e.target.value })} className="bg-[#0f172a] border border-white/5 p-5 rounded-2xl text-white text-sm" required />
                <button type="submit" className="col-span-2 text-black font-black py-5 rounded-2xl uppercase text-sm" style={{ backgroundColor: colorPrimario }}>Registrar Gasto</button>
              </form>
            </div>
          </div>
        )}

      </main>

      {/* Modal Upgrade */}
      {modalUpgrade.abierto && (
        <UpgradePlanModal
          planActual={negocio.plan}
          featureBloqueada={modalUpgrade.feature}
          onClose={() => setModalUpgrade({ abierto: false, feature: '' })}
          onUpgrade={(plan: any) => handleUpgrade(plan)}
        />
      )}
    </div>
  )
}
