// ============================================================================
// ARCHIVO: app/(owner)/dashboard/page.tsx
// DESCRIPCIÓN: Dashboard principal del sistema de gestión de turnos
// 
// CARACTERÍSTICAS PRINCIPALES:
// - Sistema RBAC con 4 roles: admin, manager, staff, recepcionista
// - Autenticación real con Supabase
// - Abstracción completa de dominio (labels dinámicos)
// - Blindaje anti-crash en secciones Pro
// - Early returns para optimización de recursos
// - Optional chaining en todos los accesos a datos
// ============================================================================

'use client'

// ============================================================================
// IMPORTACIONES
// ============================================================================

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { 
  Negocio, 
  Servicio, 
  Staff, 
  Turno, 
  Egreso, 
  RolUsuario, 
  FormTurno, 
  FormServicio, 
  FormStaff, 
  FormEgreso, 
  Message 
} from '@/types/database.types'
import { usePuede, usePlanFeatures } from '@/lib/permisos'
import CalendarioSemanal from '@/components/dashboard/CalendarioSemanal'
import UpgradePlanModal from '@/components/dashboard/UpgradePlanModal'

// ============================================================================
// TIPOS LOCALES
// ============================================================================

type SeccionActiva = 'agenda' | 'servicios' | 'staff' | 'clientes' | 'finanzas' | 'configuracion'

// Definición de los 4 roles del sistema RBAC
// - admin: Acceso total, gestión de configuración y planes
// - manager: Gestión de recursos, staff y agenda (sin finanzas ni configuración)
// - staff: Solo visualización de su propia agenda y turnos
// - recepcionista: Gestión de agenda global y clientes (sin configuración)
type RolSistema = 'admin' | 'manager' | 'staff' | 'recepcionista'

// Interfaz para el perfil del usuario autenticado
interface Perfil {
  id: string
  email: string
  nombre: string | null
  rol: 'admin' | 'manager' | 'staff' | 'recepcionista'
  negocio_id: string | null
  avatar_url: string | null
}

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

export default function DashboardOwner() {
  
  const router = useRouter()
  
  // ==========================================================================
  // ESTADO - Autenticación
  // ==========================================================================
  
  const [perfil, setPerfil] = useState<Perfil | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [loadingAuth, setLoadingAuth] = useState(true)
  
  // ==========================================================================
  // ESTADO - Negocio y Usuario
  // ==========================================================================
  
  const [negocio, setNegocio] = useState<Negocio | null>(null)
  const [seccionActiva, setSeccionActiva] = useState<SeccionActiva>('agenda')
  const [loading, setLoading] = useState(true)

  // ==========================================================================
  // ESTADO - Datos de Supabase
  // ==========================================================================
  
  const [servicios, setServicios] = useState<Servicio[]>([])
  const [staff, setStaff] = useState<Staff[]>([])
  const [turnos, setTurnos] = useState<Turno[]>([])
  const [egresos, setEgresos] = useState<Egreso[]>([])

  // ==========================================================================
  // ESTADO - Formularios
  // ==========================================================================
  
  const [formTurno, setFormTurno] = useState<FormTurno>({
    cliente: '', 
    telefono: '', 
    email: '', 
    servicio: '', 
    staff: '', 
    fecha: '', 
    notas: ''
  })
  
  const [formServicio, setFormServicio] = useState<FormServicio>({
    nombre: '', 
    descripcion: '', 
    precio: '', 
    duracion: '', 
    ocultar_precio: false
  })
  
  const [formStaff, setFormStaff] = useState<FormStaff>({
    nombre: '', 
    especialidad: '', 
    horario_inicio: '09:00', 
    horario_fin: '18:00', 
    dias_trabajo: ['L', 'Ma', 'Mi', 'J', 'V']
  })
  
  const [formEgreso, setFormEgreso] = useState<FormEgreso>({
    categoria: 'otro', 
    descripcion: '', 
    monto: '', 
    fecha: new Date().toISOString().split('T')[0]
  })

  // ==========================================================================
  // ESTADO - UI/UX
  // ==========================================================================
  
  const [filtroFecha, setFiltroFecha] = useState(new Date().toISOString().split('T')[0])
  const [mensaje, setMensaje] = useState<Message>({ texto: '', tipo: 'info' })
  const [modalUpgrade, setModalUpgrade] = useState<{ abierto: boolean; feature: string }>({ 
    abierto: false, 
    feature: '' 
  })
  const [modalTurno, setModalTurno] = useState<{ abierto: boolean; turno: Turno | null }>({ 
    abierto: false, 
    turno: null 
  })

  // ==========================================================================
  // EFECTO: Verificar autenticación (EJECUTAR PRIMERO)
  // TRAZABILIDAD:
  // 1. Al montar el componente, verifica si hay sesión
  // 2. Obtiene el usuario autenticado
  // 3. Carga su perfil desde la tabla 'perfiles'
  // 4. Valida que tenga negocio asignado
  // 5. Carga los datos del negocio
  // ==========================================================================
  
  useEffect(() => {
    verificarAutenticacion()
  }, [])

  const verificarAutenticacion = async () => {
    try {
      setLoadingAuth(true)

      // PASO 1: Obtener usuario actual
      // IMPORTANTE: getUser() valida la sesión con el servidor
      const { data: { user }, error: userError } = await supabase.auth.getUser()

      if (userError || !user) {
        // Sin sesión, redirigir a login
        router.push('/login')
        return
      }

      setUserId(user.id)

      // PASO 2: Cargar perfil del usuario
      const { data: perfilData, error: perfilError } = await supabase
        .from('perfiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (perfilError || !perfilData) {
        notify('❌ Error al cargar tu perfil', 'error')
        router.push('/login')
        return
      }

      setPerfil(perfilData)

      // PASO 3: Validar que tenga negocio asignado
      if (!perfilData.negocio_id && perfilData.rol !== 'staff') {
        notify('⚠️ Necesitas configurar tu negocio', 'warning')
        router.push('/setup-negocio')
        return
      }

      // PASO 4: Cargar datos del negocio
      if (perfilData.negocio_id) {
        await cargarNegocio(perfilData.negocio_id)
      }

    } catch (error) {
      console.error('Error en autenticación:', error)
      router.push('/login')
    } finally {
      setLoadingAuth(false)
    }
  }

  // ==========================================================================
  // FUNCIÓN: Cargar negocio
  // Ahora recibe el negocio_id como parámetro
  // TRAZABILIDAD: Supabase → Estado local → UI
  // ==========================================================================
  
  const cargarNegocio = async (negocioId: string) => {
    setLoading(true)
    
    try {
      // -----------------------------------------------------------------------
      // PASO 1: Obtener negocio específico
      // -----------------------------------------------------------------------
      const { data: negocioData, error: negocioError } = await supabase
        .from('Negocio')
        .select('*')
        .eq('id', negocioId)
        .single()

      if (negocioError || !negocioData) {
        console.error('Error cargando negocio:', negocioError)
        notify('❌ Error al cargar el negocio', 'error')
        setLoading(false)
        return
      }

      setNegocio(negocioData)

      // -----------------------------------------------------------------------
      // PASO 2: Cargar datos relacionados en PARALELO
      // -----------------------------------------------------------------------
      const [serviciosRes, staffRes, turnosRes, egresosRes] = await Promise.all([
        supabase
          .from('Servicio')
          .select('*')
          .eq('negocio_id', negocioData.id),
        
        supabase
          .from('Staff')
          .select('*')
          .eq('negocio_id', negocioData.id),
        
        supabase
          .from('turnos')
          .select('*, Servicio(*), Staff(*)')
          .eq('negocio_id', negocioData.id)
          .gte('hora_inicio', new Date().toISOString()),
        
        supabase
          .from('Egresos')
          .select('*')
          .eq('negocio_id', negocioData.id)
      ])

      // Validación de errores individual
      if (serviciosRes.error) console.error('Error servicios:', serviciosRes.error)
      if (staffRes.error) console.error('Error staff:', staffRes.error)
      if (turnosRes.error) console.error('Error turnos:', turnosRes.error)
      if (egresosRes.error) console.error('Error egresos:', egresosRes.error)

      // Filtrar servicios activos con blindaje
      const serviciosActivos = (serviciosRes.data || []).filter(s => 
        s.activo === undefined || s.activo === true
      )

      // Guardar en estado con fallback a array vacío
      setServicios(serviciosActivos)
      setStaff(staffRes.data || [])
      setTurnos(turnosRes.data || [])
      setEgresos(egresosRes.data || [])

    } catch (error) {
      console.error('Error en cargarNegocio:', error)
      notify('❌ Error general al cargar datos', 'error')
    } finally {
      setTimeout(() => setLoading(false), 500)
    }
  }

  // ==========================================================================
  // FUNCIÓN: Sistema de notificaciones
  // ==========================================================================
  
  const notify = (texto: string, tipo: Message['tipo']) => {
    setMensaje({ texto, tipo })
    setTimeout(() => setMensaje({ texto: '', tipo: 'info' }), 4000)
  }

  // ==========================================================================
  // FUNCIÓN: Cerrar sesión
  // ==========================================================================
  
  const handleLogout = async () => {
    try {
      // PASO 1: Cerrar sesión en Supabase
      // Esto elimina la cookie de sesión
      const { error } = await supabase.auth.signOut()
      
      if (error) throw error

      // PASO 2: Limpiar estado local
      setPerfil(null)
      setNegocio(null)
      setUserId(null)

      // PASO 3: Redirigir a login
      router.push('/login')
      
    } catch (error: any) {
      console.error('Error al cerrar sesión:', error)
      notify(`❌ Error: ${error.message}`, 'error')
    }
  }

  // ==========================================================================
  // FUNCIÓN: Verificar acceso a features premium
  // BLINDAJE: Fallback robusto si plan es undefined
  // ==========================================================================
  
  const verificarAccesoFeature = (seccion: SeccionActiva): boolean => {
    // EARLY RETURN: Sin negocio, negar acceso
    if (!negocio) return false
    
    // BLINDAJE: Si plan es undefined, usar 'trial' por defecto
    const planSeguro = negocio.plan || 'trial'
    const features = usePlanFeatures(planSeguro)
    
    // BLINDAJE: Si features es undefined, usar valores restrictivos
    if (!features) {
      console.error('Features es undefined para el plan:', planSeguro)
      return false
    }
    
    // Validación de acceso a CRM
    if (seccion === 'clientes' && !features.canAccessCRM) {
      setModalUpgrade({ abierto: true, feature: 'CRM de Clientes' })
      return false
    }
    
    // Validación de acceso a Finanzas
    if (seccion === 'finanzas' && !features.canAccessFinanzas) {
      setModalUpgrade({ abierto: true, feature: 'Reportes Financieros' })
      return false
    }
    
    return true
  }

  // ==========================================================================
  // FUNCIÓN: Verificar permisos RBAC por rol
  // EARLY RETURNS: Optimización de recursos
  // ==========================================================================
  
  const tieneAccesoSeccion = (seccion: SeccionActiva): boolean => {
    // Matriz de permisos RBAC
    const permisosPorRol: Record<RolSistema, SeccionActiva[]> = {
      admin: ['agenda', 'servicios', 'staff', 'clientes', 'finanzas', 'configuracion'],
      manager: ['agenda', 'servicios', 'staff', 'clientes'],
      recepcionista: ['agenda', 'clientes'],
      staff: ['agenda']
    }
    
    return permisosPorRol[perfil?.rol || 'staff']?.includes(seccion) || false
  }

  // ==========================================================================
  // FUNCIÓN: Cambiar sección con validación de permisos
  // ==========================================================================
  
  const cambiarSeccion = (seccion: SeccionActiva) => {
    // EARLY RETURN: Sin permisos RBAC, salir
    if (!tieneAccesoSeccion(seccion)) {
      notify('⛔ No tienes permisos para acceder a esta sección', 'error')
      return
    }
    
    // Verificar si tiene acceso según el plan
    if (verificarAccesoFeature(seccion)) {
      setSeccionActiva(seccion)
    }
  }

  // ==========================================================================
  // HANDLER: Crear turno
  // ==========================================================================
  
  const handleCrearTurno = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!negocio) return

    // Validación: Cliente requerido
    if (!formTurno.cliente.trim()) {
      return notify('⚠️ El nombre del cliente es requerido', 'error')
    }

    const isoFecha = new Date(formTurno.fecha).toISOString()
    
    // Verificar conflictos de horario
    const conflicto = turnos.find(t => 
      t.staff_id === formTurno.staff && 
      t.hora_inicio === isoFecha && 
      t.estado !== 'finalizado' &&
      t.estado !== 'cancelado'
    )

    if (conflicto) {
      return notify('⚠️ El profesional ya tiene un turno a esa hora', 'error')
    }

    // Inserción en Supabase
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

    // Reset y recarga
    setFormTurno({ 
      cliente: '', 
      telefono: '', 
      email: '', 
      servicio: '', 
      staff: '', 
      fecha: '', 
      notas: '' 
    })
    notify('🚀 Turno agendado con éxito', 'success')
    if (negocio.id) cargarNegocio(negocio.id)
  }

  // ==========================================================================
  // HANDLER: Crear servicio
  // ==========================================================================
  
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

    setFormServicio({ 
      nombre: '', 
      descripcion: '', 
      precio: '', 
      duracion: '', 
      ocultar_precio: false 
    })
    notify('✅ Servicio creado', 'success')
    if (negocio.id) cargarNegocio(negocio.id)
  }

  // ==========================================================================
  // HANDLER: Crear staff
  // ==========================================================================
  
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

    setFormStaff({ 
      nombre: '', 
      especialidad: '', 
      horario_inicio: '09:00', 
      horario_fin: '18:00', 
      dias_trabajo: ['L', 'Ma', 'Mi', 'J', 'V'] 
    })
    notify('👤 Staff vinculado', 'success')
    if (negocio.id) cargarNegocio(negocio.id)
  }

  // ==========================================================================
  // HANDLER: Crear egreso
  // ==========================================================================
  
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

    setFormEgreso({ 
      categoria: 'otro', 
      descripcion: '', 
      monto: '', 
      fecha: new Date().toISOString().split('T')[0] 
    })
    notify('💰 Gasto registrado', 'success')
    if (negocio.id) cargarNegocio(negocio.id)
  }

  // ==========================================================================
  // HANDLER: Upgrade de plan
  // ==========================================================================
  
  const handleUpgrade = async (nuevoPlan: 'basico' | 'pro') => {
    if (!negocio) return
    
    // TODO: Integración con Mercado Pago
    alert(`Redirigiendo a pago de ${nuevoPlan}...`)
    setModalUpgrade({ abierto: false, feature: '' })
  }

  // ==========================================================================
  // PANTALLA DE CARGA - Autenticación
  // ==========================================================================
  
  if (loadingAuth) {
    return (
      <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center gap-6">
        <div className="w-20 h-20 border-4 border-[#10b981]/10 border-t-[#10b981] rounded-full animate-spin" />
        <h2 className="text-[#10b981] font-black text-2xl uppercase tracking-[0.4em] animate-pulse">
          Verificando Sesión
        </h2>
      </div>
    )
  }

  // ==========================================================================
  // PANTALLA DE CARGA - Datos
  // ==========================================================================
  
  if (loading || !negocio || !perfil) {
    return (
      <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center gap-6">
        <div className="w-20 h-20 border-4 border-[#10b981]/10 border-t-[#10b981] rounded-full animate-spin" />
        <h2 className="text-[#10b981] font-black text-2xl uppercase tracking-[0.4em] animate-pulse">
          Cargando Plataforma
        </h2>
      </div>
    )
  }

  // ==========================================================================
  // VARIABLES DERIVADAS CON BLINDAJE
  // ==========================================================================
  
  // Rol real del usuario autenticado
  const rol = perfil.rol
  
  // ABSTRACCIÓN DE DOMINIO: Labels dinámicos
  const labelServicio = negocio.label_servicio || 'Servicio'
  const labelStaff = negocio.label_staff || 'Staff'
  const labelCliente = negocio.label_cliente || 'Cliente'
  
  const colorPrimario = negocio.color_primario || '#10b981'
  const planActual = negocio.plan || 'trial'
  
  // BLINDAJE: Fallback completo para features
  const features = usePlanFeatures(planActual) || {
    canAccessCRM: false,
    canAccessFinanzas: false,
    maxStaff: 1,
    maxServicios: 5
  }

  // Cálculo de días trial
  const diasTrial = (negocio.plan === 'trial' && negocio.trial_ends_at) 
    ? Math.max(0, Math.floor(
        (new Date(negocio.trial_ends_at).getTime() - new Date().getTime()) 
        / (1000 * 3600 * 24)
      ))
    : 0

  // Cálculos financieros
  const turnosHoy = turnos.filter(t => t.hora_inicio?.includes(filtroFecha))
  const ingresosBrutos = turnosHoy
    .filter(t => t.estado === 'finalizado')
    .reduce((sum, t) => sum + (t.Servicio?.precio || 0), 0)
  const egresosHoy = egresos
    .filter(e => e.fecha === filtroFecha)
    .reduce((sum, e) => sum + e.monto, 0)
  const gananciaNeta = ingresosBrutos - egresosHoy

  // Top clientes
  const getTopClientes = () => {
    const mapa = new Map<string, { visitas: number; total: number }>()
    
    turnos.forEach(t => {
      const actual = mapa.get(t.nombre_cliente) || { visitas: 0, total: 0 }
      actual.visitas += 1
      if (t.estado === 'finalizado') {
        actual.total += t.Servicio?.precio || 0
      }
      mapa.set(t.nombre_cliente, actual)
    })
    
    return Array.from(mapa.entries())
      .sort((a, b) => b[1].total - a[1].total)
      .slice(0, 6)
  }

  // Función para obtener icono por rol
  const getIconoRol = (rolActual: RolSistema): string => {
    const iconos: Record<RolSistema, string> = {
      admin: '👑',
      manager: '📊',
      recepcionista: '💁',
      staff: '👤'
    }
    return iconos[rolActual] || '👤'
  }

  // Función para obtener nombre legible del rol
  const getNombreRol = (rolActual: RolSistema): string => {
    const nombres: Record<RolSistema, string> = {
      admin: 'Administrador',
      manager: 'Gerente',
      recepcionista: 'Recepcionista',
      staff: 'Staff'
    }
    return nombres[rolActual] || 'Usuario'
  }

  // ==========================================================================
  // RENDERIZADO
  // ==========================================================================
  
  return (
    <div className="min-h-screen bg-[#020617] text-slate-300 flex font-sans">
      
      {/* ====================================================================
          SIDEBAR
          ==================================================================== */}
      <aside className="w-80 border-r border-white/5 bg-[#020617] flex flex-col p-10 gap-10 sticky top-0 h-screen overflow-y-auto">
        
        {/* Logo del negocio */}
        <div className="flex items-center gap-4">
          <div 
            className="w-12 h-12 rounded-2xl flex items-center justify-center text-black font-black text-3xl shadow-[0_0_30px_rgba(16,185,129,0.3)]"
            style={{ 
              background: `linear-gradient(to bottom right, ${colorPrimario}, ${colorPrimario}dd)` 
            }}
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

        {/* Info del usuario autenticado */}
        <div className="bg-[#0f172a] border border-white/5 p-4 rounded-2xl">
          <p className="text-[10px] font-black uppercase text-slate-500 mb-3">
            👤 Usuario
          </p>
          <div className="space-y-2">
            <p className="text-sm font-bold text-white truncate">
              {perfil.nombre || perfil.email}
            </p>
            <p className="text-xs text-slate-400 truncate">
              {perfil.email}
            </p>
            <div className="pt-3 border-t border-white/5">
              <p className="text-[9px] text-slate-500 uppercase mb-1">Rol</p>
              <div className="flex items-center gap-2">
                <span className="text-lg">
                  {getIconoRol(rol)}
                </span>
                <span className="text-xs font-black uppercase" style={{ color: colorPrimario }}>
                  {getNombreRol(rol)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Warning de trial */}
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

        {/* Navegación con permisos RBAC */}
        <nav className="flex flex-col gap-2 flex-1">
          {[
            { id: 'agenda', label: 'Agenda', icon: '🗓️' },
            { id: 'servicios', label: `${labelServicio}s`, icon: '✂️' },
            { id: 'staff', label: `${labelStaff}s`, icon: '👥' },
            { id: 'clientes', label: 'CRM', icon: '💎', premium: !features.canAccessCRM },
            { id: 'finanzas', label: 'Finanzas', icon: '💰', premium: !features.canAccessFinanzas },
            { id: 'configuracion', label: 'Config', icon: '⚙️' },
          ].map((item) => {
            const tienePermiso = tieneAccesoSeccion(item.id as SeccionActiva)
            
            return (
              <button
                key={item.id}
                onClick={() => cambiarSeccion(item.id as SeccionActiva)}
                disabled={!tienePermiso}
                className={`flex items-center gap-4 p-5 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest transition-all relative ${
                  seccionActiva === item.id 
                    ? `text-black shadow-xl` 
                    : tienePermiso
                      ? 'hover:bg-white/5 text-slate-500'
                      : 'opacity-30 cursor-not-allowed text-slate-700'
                }`}
                style={seccionActiva === item.id ? { backgroundColor: colorPrimario } : {}}
              >
                <span className="text-xl">{item.icon}</span>
                {item.label}
                {item.premium && tienePermiso && (
                  <span className="ml-auto text-yellow-500 text-lg">🔒</span>
                )}
                {!tienePermiso && (
                  <span className="ml-auto text-red-500 text-lg">⛔</span>
                )}
              </button>
            )
          })}
        </nav>

        {/* Botón de cerrar sesión */}
        <button
          onClick={handleLogout}
          className="mt-auto p-5 rounded-[1.5rem] bg-red-500/10 border border-red-500/20 text-red-400 font-black uppercase text-[10px] tracking-widest hover:bg-red-500/20 transition-all flex items-center justify-center gap-3"
        >
          <span className="text-xl">🚪</span>
          Cerrar Sesión
        </button>

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

      {/* ====================================================================
          MAIN CONTENT
          ==================================================================== */}
      <main className="flex-1 p-12 overflow-y-auto">
        
        {/* SECCIÓN: AGENDA */}
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

            {/* Formulario crear turno - Solo admin, manager, recepcionista */}
            {(rol === 'admin' || rol === 'manager' || rol === 'recepcionista') && (
              <div className="bg-[#0f172a] p-10 rounded-[3rem] border border-white/5">
                <h3 className="text-2xl font-black text-white italic uppercase mb-6">
                  Nuevo Turno
                </h3>
                <form onSubmit={handleCrearTurno} className="grid grid-cols-2 gap-4">
                  <input
                    type="text"
                    placeholder={`Nombre del ${labelCliente.toLowerCase()}`}
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
                    <option value="">Seleccionar {labelServicio.toLowerCase()}</option>
                    {servicios?.map(s => (
                      <option key={s.id} value={s.id}>{s.nombre} - ${s.precio}</option>
                    ))}
                  </select>
                  <select
                    value={formTurno.staff}
                    onChange={(e) => setFormTurno({ ...formTurno, staff: e.target.value })}
                    className="bg-[#020617] border border-white/5 p-5 rounded-2xl text-white text-sm outline-none"
                    required
                  >
                    <option value="">Seleccionar {labelStaff.toLowerCase()}</option>
                    {staff?.filter(s => s.activo).map(s => (
                      <option key={s.id} value={s.id}>{s.nombre}</option>
                    ))}
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
            )}

            {/* Caja del día */}
            <div 
              className="p-12 rounded-[3.5rem] text-[#020617] shadow-2xl" 
              style={{ backgroundColor: colorPrimario }}
            >
              <p className="text-[11px] font-black uppercase tracking-widest opacity-60">
                Ingresos Hoy
              </p>
              <p className="text-7xl font-black italic tracking-tighter my-4">
                ${ingresosBrutos}
              </p>
              <p className="text-xs font-bold opacity-60">
                {turnosHoy.filter(t => t.estado === 'finalizado').length} turnos finalizados
              </p>
            </div>
          </div>
        )}

        {/* SECCIÓN: SERVICIOS */}
        {seccionActiva === 'servicios' && (
          <div className="space-y-12">
            <h2 className="text-5xl font-black text-white italic uppercase tracking-tighter">
              Catálogo de <span style={{ color: colorPrimario }}>{labelServicio}s</span>
            </h2>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {servicios?.map(s => (
                <div key={s.id} className="bg-[#0f172a] p-12 rounded-[4rem] border border-white/5">
                  <p className="text-white font-black uppercase italic text-3xl tracking-tighter">
                    {s.nombre}
                  </p>
                  {s.descripcion && (
                    <p className="text-slate-400 text-sm mt-2">{s.descripcion}</p>
                  )}
                  <div className="flex items-baseline gap-2 mt-6">
                    <p className="text-5xl font-black italic" style={{ color: colorPrimario }}>
                      ${s.precio}
                    </p>
                    <span className="text-slate-600 text-sm">• {s.duracion_minutos}min</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Formulario - Solo admin y manager */}
            {(rol === 'admin' || rol === 'manager') && (
              <div className="bg-[#020617] border border-white/5 p-10 rounded-[3.5rem]">
                <h4 className="text-white font-black uppercase italic mb-8">
                  Nuevo {labelServicio}
                </h4>
                <form onSubmit={handleCrearServicio} className="grid grid-cols-2 gap-4">
                  <input 
                    type="text" 
                    placeholder="Nombre" 
                    value={formServicio.nombre} 
                    onChange={e => setFormServicio({ ...formServicio, nombre: e.target.value })} 
                    className="bg-[#0f172a] border border-white/5 p-5 rounded-2xl text-white text-sm" 
                    required 
                  />
                  <input 
                    type="text" 
                    placeholder="Descripción" 
                    value={formServicio.descripcion} 
                    onChange={e => setFormServicio({ ...formServicio, descripcion: e.target.value })} 
                    className="bg-[#0f172a] border border-white/5 p-5 rounded-2xl text-white text-sm" 
                  />
                  <input 
                    type="number" 
                    placeholder="Precio" 
                    value={formServicio.precio} 
                    onChange={e => setFormServicio({ ...formServicio, precio: e.target.value })} 
                    className="bg-[#0f172a] border border-white/5 p-5 rounded-2xl text-white text-sm" 
                    required 
                  />
                  <input 
                    type="number" 
                    placeholder="Duración (min)" 
                    value={formServicio.duracion} 
                    onChange={e => setFormServicio({ ...formServicio, duracion: e.target.value })} 
                    className="bg-[#0f172a] border border-white/5 p-5 rounded-2xl text-white text-sm" 
                    required 
                  />
                  <label className="flex items-center gap-3 col-span-2 text-sm text-slate-400">
                    <input 
                      type="checkbox" 
                      checked={formServicio.ocultar_precio} 
                      onChange={e => setFormServicio({ ...formServicio, ocultar_precio: e.target.checked })} 
                      className="w-5 h-5" 
                    />
                    Ocultar precio en reservas públicas
                  </label>
                  <button 
                    type="submit" 
                    className="col-span-2 text-black font-black py-5 rounded-2xl uppercase text-sm" 
                    style={{ backgroundColor: colorPrimario }}
                  >
                    Crear {labelServicio}
                  </button>
                </form>
              </div>
            )}
          </div>
        )}

        {/* SECCIÓN: STAFF */}
        {seccionActiva === 'staff' && (
          <div className="space-y-12">
            <h2 className="text-5xl font-black text-white italic uppercase tracking-tighter">
              Equipo de <span style={{ color: colorPrimario }}>{labelStaff}s</span>
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
              {staff?.map(s => (
                <div key={s.id} className="bg-[#0f172a] p-12 rounded-[4rem] border border-white/5 text-center">
                  <div 
                    className="w-24 h-24 rounded-full flex items-center justify-center text-4xl mx-auto mb-8" 
                    style={{ backgroundColor: `${colorPrimario}20` }}
                  >
                    👤
                  </div>
                  <p className="text-white font-black uppercase italic text-2xl tracking-tighter">
                    {s.nombre}
                  </p>
                  {s.especialidad && (
                    <p className="text-slate-400 text-xs mt-2">{s.especialidad}</p>
                  )}
                  <p 
                    className="text-[10px] font-black uppercase mt-4 tracking-widest" 
                    style={{ color: s.activo ? colorPrimario : '#ef4444' }}
                  >
                    {s.activo ? 'Activo' : 'Inactivo'}
                  </p>
                </div>
              ))}
            </div>

            {/* Formulario - Solo admin y manager */}
            {(rol === 'admin' || rol === 'manager') && (
              <div className="bg-[#020617] border border-white/5 p-10 rounded-[3.5rem]">
                <h4 className="text-white font-black uppercase italic mb-8">
                  Nuevo {labelStaff}
                </h4>
                <form onSubmit={handleCrearStaff} className="grid grid-cols-2 gap-4">
                  <input 
                    type="text" 
                    placeholder="Nombre completo" 
                    value={formStaff.nombre} 
                    onChange={e => setFormStaff({ ...formStaff, nombre: e.target.value })} 
                    className="bg-[#0f172a] border border-white/5 p-5 rounded-2xl text-white text-sm" 
                    required 
                  />
                  <input 
                    type="text" 
                    placeholder="Especialidad" 
                    value={formStaff.especialidad} 
                    onChange={e => setFormStaff({ ...formStaff, especialidad: e.target.value })} 
                    className="bg-[#0f172a] border border-white/5 p-5 rounded-2xl text-white text-sm" 
                  />
                  <button 
                    type="submit" 
                    className="col-span-2 text-black font-black py-5 rounded-2xl uppercase text-sm" 
                    style={{ backgroundColor: colorPrimario }}
                  >
                    Agregar al Equipo
                  </button>
                </form>
              </div>
            )}
          </div>
        )}

        {/* SECCIÓN: CLIENTES */}
        {seccionActiva === 'clientes' && (
          <div className="space-y-12">
            <h2 className="text-5xl font-black text-white italic uppercase tracking-tighter">
              Top <span style={{ color: colorPrimario }}>{labelCliente}s</span>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {getTopClientes()?.map(([nombre, datos]) => (
                <div key={nombre} className="bg-[#0f172a] p-10 rounded-[4rem] border border-white/5">
                  <div 
                    className="w-16 h-16 rounded-full flex items-center justify-center text-3xl mb-8" 
                    style={{ backgroundColor: `${colorPrimario}20` }}
                  >
                    👤
                  </div>
                  <p className="text-3xl font-black text-white uppercase italic tracking-tighter">
                    {nombre}
                  </p>
                  <div className="grid grid-cols-2 gap-6 mt-10 pt-8 border-t border-white/5">
                    <div>
                      <p className="text-[10px] text-slate-500 uppercase">Visitas</p>
                      <p className="text-2xl font-black italic" style={{ color: colorPrimario }}>
                        {datos.visitas}
                      </p>
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

        {/* SECCIÓN: FINANZAS */}
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

            {/* Formulario - Solo admin */}
            {rol === 'admin' && (
              <div className="bg-[#020617] border border-white/5 p-10 rounded-[3.5rem]">
                <h4 className="text-white font-black uppercase italic mb-8">Registrar Gasto</h4>
                <form onSubmit={handleCrearEgreso} className="grid grid-cols-2 gap-4">
                  <select 
                    value={formEgreso.categoria} 
                    onChange={e => setFormEgreso({ ...formEgreso, categoria: e.target.value as any })} 
                    className="bg-[#0f172a] border border-white/5 p-5 rounded-2xl text-white text-sm" 
                    required
                  >
                    <option value="alquiler">Alquiler</option>
                    <option value="luz">Luz</option>
                    <option value="agua">Agua</option>
                    <option value="productos">Productos</option>
                    <option value="sueldos">Sueldos</option>
                    <option value="impuestos">Impuestos</option>
                    <option value="otro">Otro</option>
                  </select>
                  <input 
                    type="text" 
                    placeholder="Descripción" 
                    value={formEgreso.descripcion} 
                    onChange={e => setFormEgreso({ ...formEgreso, descripcion: e.target.value })} 
                    className="bg-[#0f172a] border border-white/5 p-5 rounded-2xl text-white text-sm" 
                    required 
                  />
                  <input 
                    type="number" 
                    placeholder="Monto" 
                    value={formEgreso.monto} 
                    onChange={e => setFormEgreso({ ...formEgreso, monto: e.target.value })} 
                    className="bg-[#0f172a] border border-white/5 p-5 rounded-2xl text-white text-sm" 
                    required 
                  />
                  <input 
                    type="date" 
                    value={formEgreso.fecha} 
                    onChange={e => setFormEgreso({ ...formEgreso, fecha: e.target.value })} 
                    className="bg-[#0f172a] border border-white/5 p-5 rounded-2xl text-white text-sm" 
                    required 
                  />
                  <button 
                    type="submit" 
                    className="col-span-2 text-black font-black py-5 rounded-2xl uppercase text-sm" 
                    style={{ backgroundColor: colorPrimario }}
                  >
                    Registrar Gasto
                  </button>
                </form>
              </div>
            )}
          </div>
        )}

      </main>

      {/* Modal Upgrade - BLINDADO */}
      {modalUpgrade.abierto && negocio && (
        <UpgradePlanModal
          planActual={negocio.plan || 'trial'}
          featureBloqueada={modalUpgrade.feature}
          onClose={() => setModalUpgrade({ abierto: false, feature: '' })}
          onUpgrade={(plan: any) => handleUpgrade(plan)}
        />
      )}
    </div>
  )
}