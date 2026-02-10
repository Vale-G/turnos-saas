// ============================================================================
// ARCHIVO: app/(owner)/dashboard/page.tsx
// VERSIÓN: 4.0 - PRODUCTION READY
// 
// CARACTERÍSTICAS:
// ✅ Autenticación resiliente con sistema de reintentos
// ✅ Gestión de estados de turnos (PENDIENTE, EN_CURSO, FINALIZADO, CANCELADO)
// ✅ Modal de acciones rápidas para turnos
// ✅ Identificación visual por color según estado
// ✅ Logs detallados para debugging
// ✅ Blindaje anti-crash completo
// ============================================================================

'use client'

// ============================================================================
// IMPORTACIONES
// ============================================================================

import { useState, useEffect } from 'react'
import { supabase, waitForSession, checkSession } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { 
  Negocio, 
  Servicio, 
  Staff, 
  Turno, 
  Egreso, 
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
type RolSistema = 'admin' | 'manager' | 'staff' | 'recepcionista'

// Estados posibles de un turno
type EstadoTurno = 'pendiente' | 'en_curso' | 'finalizado' | 'cancelado'

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
  const [intentosRecuperacion, setIntentosRecuperacion] = useState(0)
  
  // ==========================================================================
  // ESTADO - Datos
  // ==========================================================================
  
  const [negocio, setNegocio] = useState<Negocio | null>(null)
  const [seccionActiva, setSeccionActiva] = useState<SeccionActiva>('agenda')
  const [loading, setLoading] = useState(true)
  const [errorCarga, setErrorCarga] = useState<string>('')
  
  const [servicios, setServicios] = useState<Servicio[]>([])
  const [staff, setStaff] = useState<Staff[]>([])
  const [turnos, setTurnos] = useState<Turno[]>([])
  const [egresos, setEgresos] = useState<Egreso[]>([])

  // ==========================================================================
  // ESTADO - Gestión de Turnos (NUEVO)
  // ==========================================================================
  
  const [turnoSeleccionado, setTurnoSeleccionado] = useState<Turno | null>(null)
  const [modalAccionesTurno, setModalAccionesTurno] = useState(false)
  const [confirmacionEliminar, setConfirmacionEliminar] = useState(false)

  // ==========================================================================
  // ESTADO - Formularios
  // ==========================================================================
  
  const [formTurno, setFormTurno] = useState<FormTurno>({
    cliente: '', telefono: '', email: '', servicio: '', staff: '', fecha: '', notas: ''
  })
  
  const [formServicio, setFormServicio] = useState<FormServicio>({
    nombre: '', descripcion: '', precio: '', duracion: '', ocultar_precio: false
  })
  
  const [formStaff, setFormStaff] = useState<FormStaff>({
    nombre: '', especialidad: '', horario_inicio: '09:00', horario_fin: '18:00', 
    dias_trabajo: ['L', 'Ma', 'Mi', 'J', 'V']
  })
  
  const [formEgreso, setFormEgreso] = useState<FormEgreso>({
    categoria: 'otro', descripcion: '', monto: '', fecha: new Date().toISOString().split('T')[0]
  })

  // ==========================================================================
  // ESTADO - UI/UX
  // ==========================================================================
  
  const [filtroFecha, setFiltroFecha] = useState(new Date().toISOString().split('T')[0])
  const [mensaje, setMensaje] = useState<Message>({ texto: '', tipo: 'info' })
  const [modalUpgrade, setModalUpgrade] = useState<{ abierto: boolean; feature: string }>({ 
    abierto: false, feature: '' 
  })

  // ==========================================================================
  // EFECTO: Verificar autenticación con TIMEOUT DE SEGURIDAD
  // ==========================================================================
  
  useEffect(() => {
    console.log('🚀 [DASHBOARD] Iniciando dashboard...')
    
    const timeoutId = setTimeout(() => {
      if (loadingAuth) {
        console.error('⏰ [DASHBOARD] Timeout después de 15 segundos')
        setLoadingAuth(false)
        setLoading(false)
        setErrorCarga('La carga tardó demasiado. Verifica tu conexión.')
      }
    }, 15000)

    verificarAutenticacion()

    return () => clearTimeout(timeoutId)
  }, [])

  // ==========================================================================
  // FUNCIÓN: Verificar autenticación CON REINTENTOS
  // ==========================================================================
  
  const verificarAutenticacion = async () => {
    try {
      console.log('🔐 [AUTH] Verificando autenticación...')
      setLoadingAuth(true)
      setErrorCarga('')

      // -----------------------------------------------------------------------
      // PASO 1: Intentar recuperar sesión con reintentos
      // -----------------------------------------------------------------------
      console.log('⏳ [AUTH] Intentando recuperar sesión (con reintentos)...')
      
      const session = await waitForSession(5, 500)
      
      if (!session) {
        console.error('❌ [AUTH] Fallo definitivo: no se pudo recuperar sesión')
        console.log('🔄 [AUTH] Redirigiendo a login...')
        router.push('/login')
        return
      }

      console.log('✅ [AUTH] Sesión recuperada con éxito:', {
        user_id: session.user.id,
        email: session.user.email,
        expires_at: new Date(session.expires_at! * 1000).toISOString()
      })

      const user = session.user
      setUserId(user.id)

      // -----------------------------------------------------------------------
      // PASO 2: Cargar perfil del usuario
      // -----------------------------------------------------------------------
      console.log('📡 [PERFIL] Cargando perfil desde base de datos...')
      
      const { data: perfilData, error: perfilError } = await supabase
        .from('perfiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (perfilError) {
        console.error('❌ [PERFIL] Error al cargar perfil:', perfilError)
        notify('❌ Error al cargar tu perfil', 'error')
        setLoadingAuth(false)
        setLoading(false)
        setErrorCarga(`Error de perfil: ${perfilError.message}`)
        return
      }

      if (!perfilData) {
        console.error('❌ [PERFIL] Perfil no encontrado')
        notify('❌ Perfil no encontrado', 'error')
        setLoadingAuth(false)
        setLoading(false)
        setErrorCarga('Tu perfil no existe en la base de datos.')
        return
      }

      console.log('✅ [PERFIL] Perfil cargado:', {
        id: perfilData.id,
        nombre: perfilData.nombre,
        rol: perfilData.rol,
        negocio_id: perfilData.negocio_id
      })
      
      setPerfil(perfilData)

      // -----------------------------------------------------------------------
      // PASO 3: Validar negocio asignado
      // -----------------------------------------------------------------------
      if (!perfilData.negocio_id && perfilData.rol !== 'staff') {
        console.warn('⚠️ [NEGOCIO] Usuario sin negocio asignado')
        notify('⚠️ Necesitas configurar tu negocio', 'warning')
        setLoadingAuth(false)
        setLoading(false)
        router.push('/setup-negocio')
        return
      }

      // -----------------------------------------------------------------------
      // PASO 4: Cargar datos del negocio
      // -----------------------------------------------------------------------
      if (perfilData.negocio_id) {
        console.log('🏢 [NEGOCIO] Cargando datos del negocio...')
        await cargarNegocio(perfilData.negocio_id)
      } else {
        console.log('ℹ️ [NEGOCIO] Usuario staff sin negocio')
        setLoadingAuth(false)
        setLoading(false)
      }

    } catch (error: any) {
      console.error('💥 [AUTH] Error crítico:', error)
      
      // Si es AuthSessionMissingError, intentar recuperación
      if (error.message?.includes('Auth session missing')) {
        console.warn('⚠️ [AUTH] AuthSessionMissingError detectado')
        
        if (intentosRecuperacion < 3) {
          console.log(`🔄 [AUTH] Intento de recuperación ${intentosRecuperacion + 1}/3`)
          setIntentosRecuperacion(prev => prev + 1)
          
          setTimeout(() => {
            verificarAutenticacion()
          }, 1000)
          
          return
        } else {
          console.error('❌ [AUTH] Máximo de reintentos alcanzado')
        }
      }
      
      setLoadingAuth(false)
      setLoading(false)
      setErrorCarga(`Error de autenticación: ${error.message}`)
    } finally {
      setLoadingAuth(false)
    }
  }

  // ==========================================================================
  // FUNCIÓN: Cargar negocio
  // ==========================================================================
  
  const cargarNegocio = async (negocioId: string) => {
    console.log('🏢 [NEGOCIO] Iniciando carga:', negocioId)
    setLoading(true)
    
    try {
      // -----------------------------------------------------------------------
      // PASO 1: Cargar negocio (CASE SENSITIVE)
      // -----------------------------------------------------------------------
      console.log('📡 [NEGOCIO] Consultando tabla "Negocio"...')
      const { data: negocioData, error: negocioError } = await supabase
        .from('Negocio')
        .select('*')
        .eq('id', negocioId)
        .single()

      if (negocioError) {
        console.error('❌ [NEGOCIO] Error:', negocioError)
        notify('❌ Error al cargar el negocio', 'error')
        setLoading(false)
        setErrorCarga(`Error de negocio: ${negocioError.message}`)
        return
      }

      if (!negocioData) {
        console.error('❌ [NEGOCIO] No encontrado')
        notify('❌ Negocio no encontrado', 'error')
        setLoading(false)
        setErrorCarga('No se encontró el negocio.')
        return
      }

      console.log('✅ [NEGOCIO] Cargado:', negocioData.nombre)
      setNegocio(negocioData)

      // -----------------------------------------------------------------------
      // PASO 2: Cargar datos relacionados
      // -----------------------------------------------------------------------
      console.log('📡 [DATOS] Cargando servicios, staff, turnos...')
      
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

      if (serviciosRes.error) console.error('❌ [SERVICIOS]', serviciosRes.error)
      if (staffRes.error) console.error('❌ [STAFF]', staffRes.error)
      if (turnosRes.error) console.error('❌ [TURNOS]', turnosRes.error)
      if (egresosRes.error) console.error('❌ [EGRESOS]', egresosRes.error)

      const serviciosActivos = (serviciosRes.data || []).filter(s => 
        s.activo === undefined || s.activo === true
      )

      console.log('💾 [ESTADO] Guardando datos...')
      setServicios(serviciosActivos || [])
      setStaff(staffRes.data || [])
      setTurnos(turnosRes.data || [])
      setEgresos(egresosRes.data || [])

      console.log('🎉 [ÉXITO] Dashboard cargado completamente')

    } catch (error: any) {
      console.error('💥 [NEGOCIO] Error crítico:', error)
      notify('❌ Error al cargar datos', 'error')
      setErrorCarga(`Error: ${error.message}`)
    } finally {
      console.log('🏁 [LOADING] Finalizando carga')
      setTimeout(() => setLoading(false), 500)
    }
  }

  // ==========================================================================
  // FUNCIÓN: Sistema de notificaciones
  // ==========================================================================
  
  const notify = (texto: string, tipo: Message['tipo']) => {
    console.log(`📢 [NOTIF] ${tipo.toUpperCase()}: ${texto}`)
    setMensaje({ texto, tipo })
    setTimeout(() => setMensaje({ texto: '', tipo: 'info' }), 4000)
  }

  // ==========================================================================
  // FUNCIÓN: Cerrar sesión
  // ==========================================================================
  
  const handleLogout = async () => {
    try {
      console.log('🚪 [LOGOUT] Cerrando sesión...')
      const { error } = await supabase.auth.signOut()
      
      if (error) throw error

      setPerfil(null)
      setNegocio(null)
      setUserId(null)

      console.log('✅ [LOGOUT] Sesión cerrada')
      router.push('/login')
      
    } catch (error: any) {
      console.error('❌ [LOGOUT] Error:', error)
      notify(`❌ Error: ${error.message}`, 'error')
    }
  }

  // ==========================================================================
  // FUNCIONES: Gestión de Turnos (NUEVO)
  // ==========================================================================

  // Obtener color según estado del turno
  const getColorEstado = (estado: EstadoTurno | string): string => {
    const estados: Record<string, string> = {
      'pendiente': '#eab308',      // Amarillo
      'en_curso': '#3b82f6',       // Azul
      'finalizado': '#10b981',     // Verde
      'cancelado': '#64748b'       // Gris
    }
    return estados[estado] || estados['pendiente']
  }

  // Obtener icono según estado
  const getIconoEstado = (estado: EstadoTurno | string): string => {
    const iconos: Record<string, string> = {
      'pendiente': '⏰',
      'en_curso': '▶️',
      'finalizado': '✅',
      'cancelado': '❌'
    }
    return iconos[estado] || iconos['pendiente']
  }

  // Obtener nombre legible del estado
  const getNombreEstado = (estado: EstadoTurno | string): string => {
    const nombres: Record<string, string> = {
      'pendiente': 'Pendiente',
      'en_curso': 'En Curso',
      'finalizado': 'Finalizado',
      'cancelado': 'Cancelado'
    }
    return nombres[estado] || nombres['pendiente']
  }

  // Cambiar estado de un turno
  const cambiarEstadoTurno = async (turnoId: string, nuevoEstado: EstadoTurno) => {
    try {
      console.log(`🔄 [TURNO] Cambiando estado a: ${nuevoEstado}`)
      
      const { error } = await supabase
        .from('turnos')
        .update({ estado: nuevoEstado })
        .eq('id', turnoId)

      if (error) {
        console.error('❌ [TURNO] Error al cambiar estado:', error)
        notify(`❌ Error: ${error.message}`, 'error')
        return
      }

      console.log('✅ [TURNO] Estado actualizado')
      notify(`✅ Turno marcado como ${getNombreEstado(nuevoEstado)}`, 'success')
      
      // Recargar datos
      if (negocio?.id) cargarNegocio(negocio.id)
      
      // Cerrar modal
      setModalAccionesTurno(false)
      setTurnoSeleccionado(null)

    } catch (error: any) {
      console.error('💥 [TURNO] Error crítico:', error)
      notify(`❌ Error: ${error.message}`, 'error')
    }
  }

  // Eliminar turno con confirmación
  const eliminarTurno = async (turnoId: string) => {
    try {
      console.log('🗑️ [TURNO] Eliminando turno:', turnoId)
      
      const { error } = await supabase
        .from('turnos')
        .delete()
        .eq('id', turnoId)

      if (error) {
        console.error('❌ [TURNO] Error al eliminar:', error)
        notify(`❌ Error: ${error.message}`, 'error')
        return
      }

      console.log('✅ [TURNO] Turno eliminado')
      notify('🗑️ Turno eliminado correctamente', 'success')
      
      // Recargar datos
      if (negocio?.id) cargarNegocio(negocio.id)
      
      // Cerrar modales
      setConfirmacionEliminar(false)
      setModalAccionesTurno(false)
      setTurnoSeleccionado(null)

    } catch (error: any) {
      console.error('💥 [TURNO] Error crítico:', error)
      notify(`❌ Error: ${error.message}`, 'error')
    }
  }

  // Abrir modal de acciones al hacer clic en turno
  const handleTurnoClick = (turno: Turno) => {
    console.log('📋 [TURNO] Abriendo acciones para:', turno.nombre_cliente)
    setTurnoSeleccionado(turno)
    setModalAccionesTurno(true)
  }

  // ==========================================================================
  // FUNCIÓN: Verificar acceso a features premium
  // ==========================================================================
  
  const verificarAccesoFeature = (seccion: SeccionActiva): boolean => {
    if (!negocio) return false
    
    const planSeguro = negocio.plan || 'trial'
    const features = usePlanFeatures(planSeguro)
    
    if (!features) return false
    
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

  // ==========================================================================
  // FUNCIÓN: Verificar permisos RBAC
  // ==========================================================================
  
  const tieneAccesoSeccion = (seccion: SeccionActiva): boolean => {
    const permisosPorRol: Record<RolSistema, SeccionActiva[]> = {
      admin: ['agenda', 'servicios', 'staff', 'clientes', 'finanzas', 'configuracion'],
      manager: ['agenda', 'servicios', 'staff', 'clientes'],
      recepcionista: ['agenda', 'clientes'],
      staff: ['agenda']
    }
    
    return permisosPorRol[perfil?.rol || 'staff']?.includes(seccion) || false
  }

  // ==========================================================================
  // FUNCIÓN: Cambiar sección
  // ==========================================================================
  
  const cambiarSeccion = (seccion: SeccionActiva) => {
    if (!tieneAccesoSeccion(seccion)) {
      notify('⛔ No tienes permisos', 'error')
      return
    }
    
    if (verificarAccesoFeature(seccion)) {
      setSeccionActiva(seccion)
    }
  }

  // ==========================================================================
  // HANDLERS: Formularios
  // ==========================================================================
  
  const handleCrearTurno = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!negocio) return

    if (!formTurno.cliente.trim()) {
      return notify('⚠️ El nombre del cliente es requerido', 'error')
    }

    const isoFecha = new Date(formTurno.fecha).toISOString()
    
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
    if (negocio.id) cargarNegocio(negocio.id)
  }

  const handleCrearServicio = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!negocio) return

    const precio = parseFloat(formServicio.precio)
    const duracion = parseInt(formServicio.duracion)

    if (isNaN(precio) || precio <= 0) return notify('⚠️ Precio inválido', 'error')
    if (isNaN(duracion) || duracion <= 0) return notify('⚠️ Duración inválida', 'error')

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
    if (negocio.id) cargarNegocio(negocio.id)
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
    if (negocio.id) cargarNegocio(negocio.id)
  }

  const handleCrearEgreso = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!negocio) return

    const monto = parseFloat(formEgreso.monto)
    if (isNaN(monto) || monto <= 0) return notify('⚠️ Monto inválido', 'error')

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
    if (negocio.id) cargarNegocio(negocio.id)
  }

  const handleUpgrade = async (nuevoPlan: 'basico' | 'pro') => {
    if (!negocio) return
    alert(`Redirigiendo a pago de ${nuevoPlan}...`)
    setModalUpgrade({ abierto: false, feature: '' })
  }

  // ==========================================================================
  // PANTALLA DE ERROR
  // ==========================================================================
  
  if (errorCarga && !loadingAuth && !loading) {
    return (
      <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center gap-6 p-8">
        <div className="text-red-500 text-8xl">❌</div>
        <h2 className="text-red-400 font-black text-3xl uppercase tracking-wider text-center">
          Error de Carga
        </h2>
        <p className="text-slate-400 text-center max-w-md">{errorCarga}</p>
        <div className="flex gap-4 mt-6">
          <button
            onClick={() => window.location.reload()}
            className="bg-[#10b981] text-black px-8 py-4 rounded-2xl font-black uppercase text-sm hover:scale-105 transition-transform"
          >
            🔄 Recargar
          </button>
          <button
            onClick={handleLogout}
            className="bg-red-500/20 text-red-400 px-8 py-4 rounded-2xl font-black uppercase text-sm border border-red-500/30"
          >
            🚪 Cerrar Sesión
          </button>
        </div>
        {intentosRecuperacion > 0 && (
          <p className="text-slate-600 text-xs mt-4">
            Intentos de recuperación: {intentosRecuperacion}/3
          </p>
        )}
      </div>
    )
  }

  // ==========================================================================
  // PANTALLA DE CARGA - Autenticación
  // ==========================================================================
  
  if (loadingAuth) {
    return (
      <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center gap-6">
        <div className="w-20 h-20 border-4 border-[#10b981]/10 border-t-[#10b981] rounded-full animate-spin" />
        <h2 className="text-[#10b981] font-black text-2xl uppercase tracking-[0.4em] animate-pulse">
          {intentosRecuperacion > 0 ? `Reintentando (${intentosRecuperacion}/3)` : 'Verificando Sesión'}
        </h2>
        <p className="text-slate-600 text-xs">Recuperando tu sesión...</p>
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
        <p className="text-slate-600 text-xs">Cargando negocio y datos...</p>
      </div>
    )
  }

  // ==========================================================================
  // VARIABLES DERIVADAS
  // ==========================================================================
  
  const rol = perfil.rol
  const labelServicio = negocio.label_servicio || 'Servicio'
  const labelStaff = negocio.label_staff || 'Staff'
  const labelCliente = negocio.label_cliente || 'Cliente'
  const colorPrimario = negocio.color_primario || '#10b981'
  const planActual = negocio.plan || 'trial'
  
  const features = usePlanFeatures(planActual) || {
    canAccessCRM: false,
    canAccessFinanzas: false,
    maxStaff: 1,
    maxServicios: 5
  }

  const diasTrial = (negocio.plan === 'trial' && negocio.trial_ends_at) 
    ? Math.max(0, Math.floor((new Date(negocio.trial_ends_at).getTime() - new Date().getTime()) / (1000 * 3600 * 24)))
    : 0

  const turnosHoy = turnos.filter(t => t.hora_inicio?.includes(filtroFecha))
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
    return Array.from(mapa.entries()).sort((a, b) => b[1].total - a[1].total).slice(0, 6)
  }

  const getIconoRol = (rolActual: RolSistema): string => {
    const iconos: Record<RolSistema, string> = { admin: '👑', manager: '📊', recepcionista: '💁', staff: '👤' }
    return iconos[rolActual] || '👤'
  }

  const getNombreRol = (rolActual: RolSistema): string => {
    const nombres: Record<RolSistema, string> = { admin: 'Administrador', manager: 'Gerente', recepcionista: 'Recepcionista', staff: 'Staff' }
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
            style={{ background: `linear-gradient(to bottom right, ${colorPrimario}, ${colorPrimario}dd)` }}
          >
            {negocio.nombre.charAt(0)}
          </div>
          <div>
            <h1 className="font-black italic text-white text-xl tracking-tighter uppercase leading-none">
              {negocio.nombre}
            </h1>
            <p className="text-[10px] text-slate-600 font-bold uppercase tracking-wider mt-1">
              {negocio.vertical || 'Negocio'}
            </p>
          </div>
        </div>

        {/* Info del usuario */}
        <div className="bg-[#0f172a] border border-white/5 p-4 rounded-2xl">
          <p className="text-[10px] font-black uppercase text-slate-500 mb-3">👤 Usuario</p>
          <div className="space-y-2">
            <p className="text-sm font-bold text-white truncate">{perfil.nombre || perfil.email}</p>
            <p className="text-xs text-slate-400 truncate">{perfil.email}</p>
            <div className="pt-3 border-t border-white/5">
              <p className="text-[9px] text-slate-500 uppercase mb-1">Rol</p>
              <div className="flex items-center gap-2">
                <span className="text-lg">{getIconoRol(rol)}</span>
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

        {/* Navegación */}
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
                    : tienePermiso ? 'hover:bg-white/5 text-slate-500' : 'opacity-30 cursor-not-allowed text-slate-700'
                }`}
                style={seccionActiva === item.id ? { backgroundColor: colorPrimario } : {}}
              >
                <span className="text-xl">{item.icon}</span>
                {item.label}
                {item.premium && tienePermiso && <span className="ml-auto text-yellow-500 text-lg">🔒</span>}
                {!tienePermiso && <span className="ml-auto text-red-500 text-lg">⛔</span>}
              </button>
            )
          })}
        </nav>

        {/* Botón cerrar sesión */}
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

            {/* Calendario con turnos */}
            {Array.isArray(staff) && Array.isArray(turnos) ? (
              <CalendarioSemanal
                turnos={turnos}
                staff={staff.filter(s => s.activo)}
                onTurnoClick={handleTurnoClick}
                onSlotClick={(fecha, staffId) => {
                  const fechaStr = fecha.toISOString().slice(0, 16)
                  setFormTurno({ ...formTurno, fecha: fechaStr, staff: staffId })
                }}
                colorPrimario={colorPrimario}
              />
            ) : (
              <div className="bg-[#0f172a] p-12 rounded-[4rem] border border-white/5 text-center">
                <p className="text-slate-500">⚠️ No hay staff configurado para mostrar el calendario</p>
              </div>
            )}

            {/* Formulario crear turno */}
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
                    {Array.isArray(servicios) && servicios.map(s => (
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
                    {Array.isArray(staff) && staff.filter(s => s.activo).map(s => (
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
              {Array.isArray(servicios) && servicios.map(s => (
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
              {Array.isArray(staff) && staff.map(s => (
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
              {getTopClientes().map(([nombre, datos]) => (
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

      {/* ====================================================================
          MODAL: ACCIONES DE TURNO (NUEVO)
          ==================================================================== */}
      {modalAccionesTurno && turnoSeleccionado && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#0f172a] border border-white/10 rounded-[3rem] p-10 max-w-2xl w-full shadow-2xl">
            
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-3xl font-black text-white italic uppercase tracking-tighter">
                Gestionar Turno
              </h3>
              <button
                onClick={() => {
                  setModalAccionesTurno(false)
                  setTurnoSeleccionado(null)
                }}
                className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Info del turno */}
            <div className="bg-[#020617] rounded-2xl p-6 mb-8 border border-white/5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-slate-500 uppercase mb-1">Cliente</p>
                  <p className="text-white font-bold">{turnoSeleccionado.nombre_cliente}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase mb-1">Servicio</p>
                  <p className="text-white font-bold">{turnoSeleccionado.Servicio?.nombre || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase mb-1">Profesional</p>
                  <p className="text-white font-bold">{turnoSeleccionado.Staff?.nombre || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase mb-1">Estado Actual</p>
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{getIconoEstado(turnoSeleccionado.estado || 'pendiente')}</span>
                    <span 
                      className="text-sm font-black uppercase"
                      style={{ color: getColorEstado(turnoSeleccionado.estado || 'pendiente') }}
                    >
                      {getNombreEstado(turnoSeleccionado.estado || 'pendiente')}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Acciones rápidas */}
            <div className="space-y-4 mb-8">
              <p className="text-xs text-slate-500 uppercase font-black mb-4">Cambiar Estado</p>
              <div className="grid grid-cols-2 gap-4">
                {(['pendiente', 'en_curso', 'finalizado', 'cancelado'] as EstadoTurno[]).map((estado) => (
                  <button
                    key={estado}
                    onClick={() => cambiarEstadoTurno(turnoSeleccionado.id, estado)}
                    disabled={turnoSeleccionado.estado === estado}
                    className={`p-4 rounded-2xl border-2 flex items-center gap-3 font-bold text-sm uppercase transition-all ${
                      turnoSeleccionado.estado === estado
                        ? 'opacity-50 cursor-not-allowed'
                        : 'hover:scale-105 cursor-pointer'
                    }`}
                    style={{
                      borderColor: getColorEstado(estado),
                      color: getColorEstado(estado),
                      backgroundColor: `${getColorEstado(estado)}10`
                    }}
                  >
                    <span className="text-2xl">{getIconoEstado(estado)}</span>
                    {getNombreEstado(estado)}
                  </button>
                ))}
              </div>
            </div>

            {/* Botón eliminar */}
            {!confirmacionEliminar ? (
              <button
                onClick={() => setConfirmacionEliminar(true)}
                className="w-full p-5 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 font-black uppercase text-sm hover:bg-red-500/20 transition-colors flex items-center justify-center gap-3"
              >
                <span className="text-xl">🗑️</span>
                Eliminar Turno
              </button>
            ) : (
              <div className="space-y-3">
                <div className="bg-red-500/20 border border-red-500/40 rounded-2xl p-4">
                  <p className="text-red-300 text-sm text-center font-bold">
                    ⚠️ ¿Estás seguro? Esta acción no se puede deshacer
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setConfirmacionEliminar(false)}
                    className="p-4 rounded-2xl bg-white/5 border border-white/10 text-slate-400 font-bold uppercase text-xs hover:bg-white/10 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={() => eliminarTurno(turnoSeleccionado.id)}
                    className="p-4 rounded-2xl bg-red-500 text-white font-black uppercase text-xs hover:bg-red-600 transition-colors"
                  >
                    Sí, Eliminar
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      )}

      {/* ====================================================================
          MODAL: UPGRADE DE PLAN
          ==================================================================== */}
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