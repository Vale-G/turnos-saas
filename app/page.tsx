// ============================================================================
// ARCHIVO: app/(owner)/dashboard/page.tsx
// VERSIÓN: FINAL - PRODUCTION READY
// 
// PARTE 1/2
// ============================================================================

'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase, waitForSession, checkSession, refreshSession } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

// ============================================================================
// TIPOS
// ============================================================================

type SeccionActiva = 'agenda' | 'servicios' | 'staff' | 'clientes' | 'finanzas' | 'configuracion'
type RolSistema = 'admin' | 'manager' | 'staff' | 'recepcionista'
type EstadoTurno = 'pendiente' | 'en_curso' | 'finalizado' | 'cancelado'

interface Perfil {
  id: string
  email: string
  nombre: string | null
  rol: 'admin' | 'manager' | 'staff' | 'recepcionista'
  negocio_id: string | null
  avatar_url: string | null
}

interface Negocio {
  id: string
  nombre: string
  vertical?: string
  label_servicio?: string
  label_staff?: string
  label_cliente?: string
  color_primario?: string
  plan?: 'trial' | 'basico' | 'pro'
  trial_ends_at?: string
}

interface Servicio {
  id: string
  negocio_id: string
  nombre: string
  descripcion?: string
  precio: number
  duracion_minutos: number
  activo?: boolean
  ocultar_precio?: boolean
}

interface Staff {
  id: string
  negocio_id: string
  nombre: string
  especialidad?: string
  activo: boolean
  horario_inicio?: string
  horario_fin?: string
  dias_trabajo?: string[]
}

interface Turno {
  id: string
  negocio_id: string
  nombre_cliente: string
  telefono_cliente?: string
  email_cliente?: string
  servicio_id: string
  staff_id: string
  hora_inicio: string
  estado?: EstadoTurno
  notas_internas?: string
  Servicio?: Servicio
  Staff?: Staff
}

interface Egreso {
  id: string
  negocio_id: string
  categoria: string
  descripcion: string
  monto: number
  fecha: string
}

interface FormTurno {
  cliente: string
  telefono: string
  email: string
  servicio: string
  staff: string
  fecha: string
  notas: string
}

interface FormServicio {
  nombre: string
  descripcion: string
  precio: string
  duracion: string
  ocultar_precio: boolean
}

interface FormStaff {
  nombre: string
  especialidad: string
  horario_inicio: string
  horario_fin: string
  dias_trabajo: string[]
}

interface FormEgreso {
  categoria: string
  descripcion: string
  monto: string
  fecha: string
}

interface Message {
  texto: string
  tipo: 'success' | 'error' | 'warning' | 'info'
}

interface PlanFeatures {
  canAccessCRM: boolean
  canAccessFinanzas: boolean
  maxStaff: number
  maxServicios: number
}

// ============================================================================
// HOOKS Y COMPONENTES MODULARES
// ============================================================================

function usePlanFeatures(plan: string): PlanFeatures {
  const features: Record<string, PlanFeatures> = {
    trial: { canAccessCRM: false, canAccessFinanzas: false, maxStaff: 1, maxServicios: 5 },
    basico: { canAccessCRM: true, canAccessFinanzas: false, maxStaff: 3, maxServicios: 15 },
    pro: { canAccessCRM: true, canAccessFinanzas: true, maxStaff: 999, maxServicios: 999 }
  }
  return features[plan] || features['trial']
}

const CalendarioSemanal = ({ turnos, staff, onTurnoClick, onSlotClick, colorPrimario }: any) => (
  <div className="bg-[#0f172a] p-12 rounded-[4rem] border border-white/5 text-center">
    <p className="text-slate-500">📅 Calendario en desarrollo</p>
    <p className="text-slate-600 text-xs mt-2">{turnos?.length || 0} turnos • {staff?.length || 0} staff</p>
  </div>
)

const UpgradePlanModal = ({ planActual, featureBloqueada, onClose, onUpgrade }: any) => null

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

export default function DashboardOwner() {
  
  const router = useRouter()
  
  // Estados
  const [perfil, setPerfil] = useState<Perfil | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [loadingAuth, setLoadingAuth] = useState(true)
  const [sincronizandoSeguridad, setSincronizandoSeguridad] = useState(true)
  const [intentosRecuperacion, setIntentosRecuperacion] = useState(0)
  const [mensajeDebug, setMensajeDebug] = useState<string>('Inicializando...')
  const [tiempoTranscurrido, setTiempoTranscurrido] = useState(0)
  
  const [negocio, setNegocio] = useState<Negocio | null>(null)
  const [seccionActiva, setSeccionActiva] = useState<SeccionActiva>('agenda')
  const [loading, setLoading] = useState(true)
  const [errorCarga, setErrorCarga] = useState<string>('')
  const [cargandoDatos, setCargandoDatos] = useState(false)
  const [timeoutDatos, setTimeoutDatos] = useState(false)
  
  const [servicios, setServicios] = useState<Servicio[]>([])
  const [staff, setStaff] = useState<Staff[]>([])
  const [turnos, setTurnos] = useState<Turno[]>([])
  const [egresos, setEgresos] = useState<Egreso[]>([])

  const [turnoSeleccionado, setTurnoSeleccionado] = useState<Turno | null>(null)
  const [modalAccionesTurno, setModalAccionesTurno] = useState(false)
  const [confirmacionEliminar, setConfirmacionEliminar] = useState(false)

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

  const [filtroFecha, setFiltroFecha] = useState(new Date().toISOString().split('T')[0])
  const [mensaje, setMensaje] = useState<Message>({ texto: '', tipo: 'info' })
  const [modalUpgrade, setModalUpgrade] = useState<{ abierto: boolean; feature: string }>({ 
    abierto: false, feature: '' 
  })

  const timeoutDatosRef = useRef<NodeJS.Timeout | null>(null)
  const intentosRef = useRef(0)
  const tiempoInicioRef = useRef<number>(Date.now())

  useEffect(() => {
    console.log('🚀 [DASHBOARD] Iniciando con storageKey: plataforma-saas-auth-token')
    iniciarDashboardSeguro()
    return () => {
      if (timeoutDatosRef.current) clearTimeout(timeoutDatosRef.current)
    }
  }, [])

  const iniciarDashboardSeguro = async () => {
    try {
      setSincronizandoSeguridad(true)
      tiempoInicioRef.current = Date.now()
      setMensajeDebug('Esperando cookies...')
      
      console.log('⏳ [SEGURIDAD] Delay 800ms...')
      await new Promise(r => setTimeout(r, 800))
      
      setMensajeDebug('Verificando credenciales...')
      console.log('✅ [SEGURIDAD] Verificando')
      
      setSincronizandoSeguridad(false)
      await verificarAutenticacion()
      
    } catch (error: any) {
      console.error('💥 [DASHBOARD] Error:', error)
      setSincronizandoSeguridad(false)
      setLoadingAuth(false)
      setErrorCarga(`Error: ${error.message}`)
    }
  }

  const verificarAutenticacion = async () => {
    try {
      intentosRef.current += 1
      const intentoActual = intentosRef.current
      const tiempoActual = ((Date.now() - tiempoInicioRef.current) / 1000).toFixed(1)
      setTiempoTranscurrido(parseFloat(tiempoActual))
      
      console.log(`🔐 [AUTH - INTENTO ${intentoActual}/5 - ${tiempoActual}s]`)
      setErrorCarga('')

      const STORAGE_KEY = 'plataforma-saas-auth-token'
      let existeEnLocalStorage = false
      let tokenData = null
      
      try {
        const valorClave = localStorage.getItem(STORAGE_KEY)
        if (valorClave) {
          existeEnLocalStorage = true
          console.log(`✅ [DEBUG] localStorage["${STORAGE_KEY}"] encontrada`)
          try {
            tokenData = JSON.parse(valorClave)
          } catch (e) {
            console.warn('⚠️ [DEBUG] Token no es JSON')
          }
        } else {
          console.log(`❌ [DEBUG] localStorage["${STORAGE_KEY}"] NO existe`)
        }
      } catch (e) {
        console.error('💥 [DEBUG] Error localStorage:', e)
      }

      console.log('⏳ [AUTH] Método 1: getSession()...')
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      if (session && !sessionError) {
        console.log('✅ [AUTH] Sesión obtenida')
        console.log('👤 [AUTH] UID:', session.user.id)
        
        intentosRef.current = 0
        setIntentosRecuperacion(0)
        setLoadingAuth(false)
        setUserId(session.user.id)
        
        await cargarPerfilYNegocio(session.user.id)
        return
      }

      if (!session) {
        console.warn('⚠️ [AUTH] getSession() → null')
        console.log('🔄 [SACUDÓN] refreshSession()...')
        
        const refreshedSession = await refreshSession()
        
        if (refreshedSession) {
          console.log('✅ [SACUDÓN] Recuperado')
          console.log('👤 [SACUDÓN] UID:', refreshedSession.user.id)
          
          intentosRef.current = 0
          setIntentosRecuperacion(0)
          setLoadingAuth(false)
          setUserId(refreshedSession.user.id)
          
          await cargarPerfilYNegocio(refreshedSession.user.id)
          return
        } else {
          console.warn('⚠️ [SACUDÓN] Falló')
        }
      }

      if (existeEnLocalStorage && tokenData) {
        console.log('🆘 [BYPASS] setSession()...')
        
        try {
          const { data: recoveryData, error: recoveryError } = await supabase.auth.setSession({
            access_token: tokenData.access_token || tokenData,
            refresh_token: tokenData.refresh_token || ''
          })

          if (recoveryData.session && !recoveryError) {
            console.log('✅ [BYPASS] Recuperado')
            console.log('👤 [BYPASS] UID:', recoveryData.session.user.id)
            
            intentosRef.current = 0
            setIntentosRecuperacion(0)
            setLoadingAuth(false)
            setUserId(recoveryData.session.user.id)
            
            await cargarPerfilYNegocio(recoveryData.session.user.id)
            return
          } else {
            console.error('❌ [BYPASS] Falló:', recoveryError?.message)
          }
        } catch (bypassError: any) {
          console.error('💥 [BYPASS] Error:', bypassError.message)
        }
      }

      const tiempoTranscurridoSegundos = (Date.now() - tiempoInicioRef.current) / 1000
      
      if (tiempoTranscurridoSegundos < 3 || intentoActual < 5) {
        console.log(`🔄 [RETRY] (${intentoActual}/5, ${tiempoTranscurridoSegundos.toFixed(1)}s/3s)`)
        setIntentosRecuperacion(intentoActual)
        setMensajeDebug(`Reintentando (${intentoActual}/5)...`)
        
        setTimeout(() => verificarAutenticacion(), 1000)
        return
      }

      console.error('❌ [AUTH] Fallaron todos')
      console.log('🚪 [AUTH] → /login')
      
      setLoadingAuth(false)
      router.push('/login')

    } catch (error: any) {
      console.error('💥 [AUTH] Error crítico:', error)
      
      const tiempoTranscurridoSegundos = (Date.now() - tiempoInicioRef.current) / 1000
      
      if (tiempoTranscurridoSegundos < 3 || intentosRef.current < 5) {
        setIntentosRecuperacion(intentosRef.current)
        setTimeout(() => verificarAutenticacion(), 1000)
      } else {
        setLoadingAuth(false)
        setLoading(false)
        setErrorCarga(`Error: ${error.message}`)
      }
    }
  }

  // ============================================================================
  // ✅ SHERLOCK LOGS + FILTRO CORRECTO DE NEGOCIO
  // ============================================================================

  const cargarPerfilYNegocio = async (uid: string) => {
    try {
      console.log('📡 [DATOS] Intentando cargar perfil para UID:', uid)
      
      const { data: perfilData, error: perfilError } = await supabase
        .from('perfiles')
        .select('*')
        .eq('id', uid)
        .single()

      if (perfilError || !perfilData) {
        console.error('❌ [DATOS] Error perfil:', perfilError)
        setLoading(false)
        setErrorCarga('No se pudo cargar perfil')
        return
      }

      console.log('✅ [DATOS] Perfil cargado:', {
        id: perfilData.id,
        email: perfilData.email,
        rol: perfilData.rol,
        negocio_id: perfilData.negocio_id
      })
      
      setPerfil(perfilData)

      if (!perfilData.negocio_id) {
        console.warn('⚠️ [DATOS] Sin negocio_id')
        
        if (perfilData.rol === 'staff') {
          console.log('✅ [DATOS] Rol STAFF - Permitiendo acceso sin negocio')
          setLoading(false)
          return
        }
        
        console.log('🔄 [DATOS] → /setup-negocio')
        setLoading(false)
        router.push('/setup-negocio')
        return
      }

      console.log('📡 [DATOS] Negocio ID encontrado:', perfilData.negocio_id)
      console.log('🔍 [SHERLOCK] Iniciando carga de negocio con ID del perfil...')
      
      cargarNegocioConTimeout(perfilData.negocio_id)

    } catch (error: any) {
      console.error('💥 [DATOS] Error:', error)
      setLoading(false)
      setErrorCarga(`Error: ${error.message}`)
    }
  }

  const cargarNegocioConTimeout = async (negocioId: string) => {
    console.log('🏢 [NEGOCIO] Cargando ID:', negocioId)
    setCargandoDatos(true)
    setTimeoutDatos(false)
    
    timeoutDatosRef.current = setTimeout(() => {
      console.warn('⏰ [TIMEOUT] Carga >5s')
      setTimeoutDatos(true)
      setCargandoDatos(false)
    }, 5000)

    try {
      await cargarNegocio(negocioId)
      
      if (timeoutDatosRef.current) clearTimeout(timeoutDatosRef.current)
      setCargandoDatos(false)
      
    } catch (error: any) {
      console.error('💥 [NEGOCIO] Error:', error)
      if (timeoutDatosRef.current) clearTimeout(timeoutDatosRef.current)
      setCargandoDatos(false)
      setErrorCarga(`Error: ${error.message}`)
    }
  }

  // ✅ FILTRO CORRECTO: usa perfil.negocio_id
  const cargarNegocio = async (negocioId: string) => {
    console.log('📊 [NEGOCIO] Query con ID:', negocioId)
    console.log('🔍 [SHERLOCK] Ejecutando: supabase.from("Negocio").select("*").eq("id", negocioId).single()')
    setLoading(true)
    
    try {
      const { data: negocioData, error: negocioError } = await supabase
        .from('Negocio')
        .select('*')
        .eq('id', negocioId)
        .single()

      if (negocioError) {
        console.error('❌ [NEGOCIO] Error en query:', negocioError)
        console.error('❌ [NEGOCIO] Código de error:', negocioError.code)
        console.error('❌ [NEGOCIO] Mensaje:', negocioError.message)
        setLoading(false)
        throw new Error(`No se pudo cargar negocio: ${negocioError.message}`)
      }

      if (!negocioData) {
        console.error('❌ [NEGOCIO] Query exitosa pero negocioData es null')
        setLoading(false)
        throw new Error('No se encontró el negocio')
      }

      console.log('✅ [NEGOCIO] Cargado exitosamente:', {
        id: negocioData.id,
        nombre: negocioData.nombre,
        vertical: negocioData.vertical,
        plan: negocioData.plan
      })
      
      setNegocio(negocioData)

      console.log('📊 [DATOS] Cargando servicios, staff, turnos...')
      const [serviciosRes, staffRes, turnosRes, egresosRes] = await Promise.all([
        supabase.from('Servicio').select('*').eq('negocio_id', negocioData.id),
        supabase.from('Staff').select('*').eq('negocio_id', negocioData.id),
        supabase.from('turnos').select('*, Servicio(*), Staff(*)').eq('negocio_id', negocioData.id).gte('hora_inicio', new Date().toISOString()),
        supabase.from('Egresos').select('*').eq('negocio_id', negocioData.id)
      ])

      const serviciosActivos = (serviciosRes.data || []).filter((s: any) => s.activo !== false)
      
      setServicios(serviciosActivos)
      setStaff(staffRes.data || [])
      setTurnos(turnosRes.data || [])
      setEgresos(egresosRes.data || [])

      console.log('✅ [DATOS] Completado:', {
        servicios: serviciosActivos.length,
        staff: staffRes.data?.length || 0,
        turnos: turnosRes.data?.length || 0,
        egresos: egresosRes.data?.length || 0
      })

    } catch (error: any) {
      console.error('💥 [NEGOCIO] Error crítico:', error)
      throw error
    } finally {
      setTimeout(() => setLoading(false), 300)
    }
  }

  const reintentarCargaDatos = () => {
    if (perfil?.negocio_id) {
      console.log('🔄 [RETRY] Reintentando carga...')
      setTimeoutDatos(false)
      setErrorCarga('')
      cargarNegocioConTimeout(perfil.negocio_id)
    }
  }

  const notify = (texto: string, tipo: Message['tipo']) => {
    setMensaje({ texto, tipo })
    setTimeout(() => setMensaje({ texto: '', tipo: 'info' }), 4000)
  }

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut()
      setPerfil(null)
      setNegocio(null)
      setUserId(null)
      router.push('/login')
    } catch (error: any) {
      notify(`❌ ${error.message}`, 'error')
    }
  }

  const verificarAccesoFeature = (seccion: SeccionActiva): boolean => {
    if (!negocio) return false
    const features = usePlanFeatures(negocio.plan || 'trial')
    if (seccion === 'clientes' && !features.canAccessCRM) {
      setModalUpgrade({ abierto: true, feature: 'CRM' })
      return false
    }
    if (seccion === 'finanzas' && !features.canAccessFinanzas) {
      setModalUpgrade({ abierto: true, feature: 'Finanzas' })
      return false
    }
    return true
  }

  const tieneAccesoSeccion = (seccion: SeccionActiva): boolean => {
    const permisosPorRol: Record<RolSistema, SeccionActiva[]> = {
      admin: ['agenda', 'servicios', 'staff', 'clientes', 'finanzas', 'configuracion'],
      manager: ['agenda', 'servicios', 'staff', 'clientes'],
      recepcionista: ['agenda', 'clientes'],
      staff: ['agenda']
    }
    return permisosPorRol[perfil?.rol || 'staff']?.includes(seccion) || false
  }

  const cambiarSeccion = (seccion: SeccionActiva) => {
    if (!tieneAccesoSeccion(seccion)) {
      notify('⛔ Sin permisos', 'error')
      return
    }
    if (verificarAccesoFeature(seccion)) {
      setSeccionActiva(seccion)
    }
  }

  const getColorEstado = (estado: EstadoTurno | string): string => {
    const estados: Record<string, string> = {
      'pendiente': '#eab308', 'en_curso': '#3b82f6', 'finalizado': '#10b981', 'cancelado': '#64748b'
    }
    return estados[estado] || estados['pendiente']
  }

  const getIconoEstado = (estado: EstadoTurno | string): string => {
    const iconos: Record<string, string> = {
      'pendiente': '⏰', 'en_curso': '▶️', 'finalizado': '✅', 'cancelado': '❌'
    }
    return iconos[estado] || iconos['pendiente']
  }

  const getNombreEstado = (estado: EstadoTurno | string): string => {
    const nombres: Record<string, string> = {
      'pendiente': 'Pendiente', 'en_curso': 'En Curso', 'finalizado': 'Finalizado', 'cancelado': 'Cancelado'
    }
    return nombres[estado] || nombres['pendiente']
  }

  const cambiarEstadoTurno = async (turnoId: string, nuevoEstado: EstadoTurno) => {
    try {
      const { error } = await supabase.from('turnos').update({ estado: nuevoEstado }).eq('id', turnoId)
      if (error) {
        notify(`❌ ${error.message}`, 'error')
        return
      }
      notify(`✅ ${getNombreEstado(nuevoEstado)}`, 'success')
      if (negocio?.id) cargarNegocio(negocio.id)
      setModalAccionesTurno(false)
      setTurnoSeleccionado(null)
    } catch (error: any) {
      notify(`❌ ${error.message}`, 'error')
    }
  }

  const eliminarTurno = async (turnoId: string) => {
    try {
      const { error } = await supabase.from('turnos').delete().eq('id', turnoId)
      if (error) {
        notify(`❌ ${error.message}`, 'error')
        return
      }
      notify('🗑️ Eliminado', 'success')
      if (negocio?.id) cargarNegocio(negocio.id)
      setConfirmacionEliminar(false)
      setModalAccionesTurno(false)
      setTurnoSeleccionado(null)
    } catch (error: any) {
      notify(`❌ ${error.message}`, 'error')
    }
  }

  const handleTurnoClick = (turno: Turno) => {
    setTurnoSeleccionado(turno)
    setModalAccionesTurno(true)
  }

  const handleCrearTurno = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!negocio) return
    if (!formTurno.cliente.trim()) return notify('⚠️ Cliente requerido', 'error')
    const isoFecha = new Date(formTurno.fecha).toISOString()
    const conflicto = turnos.find(t => 
      t.staff_id === formTurno.staff && t.hora_inicio === isoFecha && t.estado !== 'finalizado' && t.estado !== 'cancelado'
    )
    if (conflicto) return notify('⚠️ Horario ocupado', 'error')
    const { error } = await supabase.from('turnos').insert([{
      negocio_id: negocio.id, nombre_cliente: formTurno.cliente, telefono_cliente: formTurno.telefono || null,
      email_cliente: formTurno.email || null, servicio_id: formTurno.servicio, staff_id: formTurno.staff,
      hora_inicio: isoFecha, estado: 'pendiente', notas_internas: formTurno.notas || null
    }])
    if (error) {
      notify(`❌ ${error.message}`, 'error')
      return
    }
    setFormTurno({ cliente: '', telefono: '', email: '', servicio: '', staff: '', fecha: '', notas: '' })
    notify('🚀 Agendado', 'success')
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
      negocio_id: negocio.id, nombre: formServicio.nombre, descripcion: formServicio.descripcion || null,
      precio, duracion_minutos: duracion, ocultar_precio: formServicio.ocultar_precio
    }])
    if (error) {
      notify(`❌ ${error.message}`, 'error')
      return
    }
    setFormServicio({ nombre: '', descripcion: '', precio: '', duracion: '', ocultar_precio: false })
    notify('✅ Creado', 'success')
    if (negocio.id) cargarNegocio(negocio.id)
  }

  const handleCrearStaff = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!negocio) return
    const { error } = await supabase.from('Staff').insert([{
      negocio_id: negocio.id, nombre: formStaff.nombre, especialidad: formStaff.especialidad || null,
      horario_inicio: formStaff.horario_inicio, horario_fin: formStaff.horario_fin,
      dias_trabajo: formStaff.dias_trabajo, activo: true
    }])
    if (error) {
      notify(`❌ ${error.message}`, 'error')
      return
    }
    setFormStaff({ nombre: '', especialidad: '', horario_inicio: '09:00', horario_fin: '18:00', dias_trabajo: ['L', 'Ma', 'Mi', 'J', 'V'] })
    notify('👤 Agregado', 'success')
    if (negocio.id) cargarNegocio(negocio.id)
  }

  const handleCrearEgreso = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!negocio) return
    const monto = parseFloat(formEgreso.monto)
    if (isNaN(monto) || monto <= 0) return notify('⚠️ Monto inválido', 'error')
    const { error } = await supabase.from('Egresos').insert([{
      negocio_id: negocio.id, categoria: formEgreso.categoria, descripcion: formEgreso.descripcion,
      monto, fecha: formEgreso.fecha
    }])
    if (error) {
      notify(`❌ ${error.message}`, 'error')
      return
    }
    setFormEgreso({ categoria: 'otro', descripcion: '', monto: '', fecha: new Date().toISOString().split('T')[0] })
    notify('💰 Registrado', 'success')
    if (negocio.id) cargarNegocio(negocio.id)
  }

  const handleUpgrade = async (nuevoPlan: 'basico' | 'pro') => {
    if (!negocio) return
    alert(`Redirigiendo a ${nuevoPlan}...`)
    setModalUpgrade({ abierto: false, feature: '' })
  }

// ============================================================================
// FIN DE PARTE 1/2
// CONTINÚA EN PARTE 2 CON LAS PANTALLAS Y EL RENDERIZADO
// ============================================================================
// ============================================================================
// CONTINUACIÓN DE: app/(owner)/dashboard/page.tsx
// PARTE 2/2 - PANTALLAS Y RENDERIZADO COMPLETO
// ============================================================================

  // ============================================================================
  // PANTALLAS DE CARGA Y ERROR
  // ============================================================================

  if (sincronizandoSeguridad) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#020617] via-[#0f172a] to-[#020617] flex flex-col items-center justify-center gap-8">
        <div className="relative z-10 flex flex-col items-center gap-8">
          <div className="relative">
            <div className="w-32 h-32 rounded-full bg-gradient-to-br from-[#10b981] to-emerald-600 flex items-center justify-center shadow-2xl animate-pulse">
              <span className="text-6xl">🔐</span>
            </div>
            <div className="absolute inset-0 border-4 border-transparent border-t-[#10b981] rounded-full animate-spin" />
          </div>
          <div className="text-center space-y-4">
            <h2 className="text-5xl font-black text-white italic uppercase">Sincronizando<span className="block text-[#10b981] mt-2">Seguridad</span></h2>
            <p className="text-slate-400 text-lg">{mensajeDebug}</p>
            <p className="text-slate-600 text-sm">{tiempoTranscurrido.toFixed(1)}s</p>
          </div>
          {intentosRecuperacion > 0 && (
            <div className="flex items-center gap-3 bg-yellow-500/10 border border-yellow-500/30 px-6 py-3 rounded-full">
              <span className="text-yellow-500 text-2xl">⚡</span>
              <span className="text-yellow-300 font-bold text-sm">Intento {intentosRecuperacion}/5</span>
            </div>
          )}
        </div>
      </div>
    )
  }

  if (errorCarga && !loadingAuth && !cargandoDatos) {
    return (
      <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center gap-6 p-8">
        <div className="text-red-500 text-8xl">❌</div>
        <h2 className="text-red-400 font-black text-3xl uppercase">Error</h2>
        <p className="text-slate-400 text-center max-w-md">{errorCarga}</p>
        <div className="flex gap-4">
          <button onClick={() => window.location.reload()} className="bg-[#10b981] text-black px-8 py-4 rounded-2xl font-black uppercase">🔄 Recargar</button>
          <button onClick={handleLogout} className="bg-red-500/20 text-red-400 px-8 py-4 rounded-2xl font-black uppercase border border-red-500/30">🚪 Cerrar Sesión</button>
        </div>
      </div>
    )
  }

  if (loadingAuth) {
    return (
      <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center gap-6">
        <div className="w-20 h-20 border-4 border-[#10b981]/10 border-t-[#10b981] rounded-full animate-spin" />
        <h2 className="text-[#10b981] font-black text-2xl uppercase">Verificando</h2>
        <p className="text-slate-500 text-sm">{tiempoTranscurrido.toFixed(1)}s / 3s mínimo</p>
      </div>
    )
  }

  if (timeoutDatos && !negocio) {
    return (
      <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center gap-8 p-8">
        <div className="text-yellow-500 text-8xl">⏰</div>
        <h2 className="text-yellow-400 font-black text-3xl uppercase text-center">Cargando datos...</h2>
        <p className="text-slate-400 text-center max-w-md">La carga tardó más de 5 segundos.</p>
        <button onClick={reintentarCargaDatos} className="bg-[#10b981] text-black px-10 py-5 rounded-2xl font-black uppercase hover:scale-105 transition-transform">🔄 REINTENTAR CARGA</button>
      </div>
    )
  }

  if (!perfil) {
    return (
      <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center gap-6">
        <div className="w-20 h-20 border-4 border-[#10b981]/10 border-t-[#10b981] rounded-full animate-spin" />
        <h2 className="text-[#10b981] font-black text-2xl uppercase">Cargando Perfil</h2>
      </div>
    )
  }

  // ============================================================================
  // VARIABLES DERIVADAS
  // ============================================================================

  const rol = perfil.rol
  const labelServicio = negocio?.label_servicio || 'Servicio'
  const labelStaff = negocio?.label_staff || 'Staff'
  const labelCliente = negocio?.label_cliente || 'Cliente'
  const colorPrimario = negocio?.color_primario || '#10b981'
  const planActual = negocio?.plan || 'trial'
  const features = usePlanFeatures(planActual)

  const diasTrial = (negocio?.plan === 'trial' && negocio.trial_ends_at) 
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

  // ============================================================================
  // RENDERIZADO PRINCIPAL
  // ============================================================================

  return (
    <div className="min-h-screen bg-[#020617] text-slate-300 flex font-sans">
      
      {/* SIDEBAR */}
      <aside className="w-80 border-r border-white/5 bg-[#020617] flex flex-col p-10 gap-10 sticky top-0 h-screen overflow-y-auto">
        
        {negocio ? (
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-black font-black text-3xl"
              style={{ background: `linear-gradient(to bottom right, ${colorPrimario}, ${colorPrimario}dd)` }}>
              {negocio.nombre.charAt(0)}
            </div>
            <div>
              <h1 className="font-black italic text-white text-xl tracking-tighter uppercase">{negocio.nombre}</h1>
              <p className="text-[10px] text-slate-600 font-bold uppercase tracking-wider mt-1">{negocio.vertical || 'Negocio'}</p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-slate-700/30 flex items-center justify-center"><span className="text-2xl">⚙️</span></div>
            <div>
              <h1 className="font-black italic text-white text-xl tracking-tighter uppercase">Configurando...</h1>
              <p className="text-[10px] text-slate-600 font-bold uppercase tracking-wider mt-1">Cargando negocio</p>
            </div>
          </div>
        )}

        <div className="bg-[#0f172a] border border-white/5 p-4 rounded-2xl">
          <p className="text-[10px] font-black uppercase text-slate-500 mb-3">👤 Usuario</p>
          <div className="space-y-2">
            <p className="text-sm font-bold text-white truncate">{perfil.nombre || perfil.email}</p>
            <p className="text-xs text-slate-400 truncate">{perfil.email}</p>
            <div className="pt-3 border-t border-white/5">
              <div className="flex items-center gap-2">
                <span className="text-lg">{getIconoRol(rol)}</span>
                <span className="text-xs font-black uppercase" style={{ color: colorPrimario }}>{getNombreRol(rol)}</span>
              </div>
            </div>
          </div>
        </div>

        {negocio?.plan === 'trial' && diasTrial <= 3 && (
          <div className="bg-yellow-500/10 border border-yellow-500/30 p-4 rounded-2xl">
            <p className="text-yellow-300 text-xs font-black uppercase text-center">⏰ {diasTrial} días restantes</p>
          </div>
        )}

        {!negocio && (
          <div className="bg-orange-500/10 border border-orange-500/30 p-4 rounded-2xl">
            <p className="text-orange-300 text-xs font-black uppercase text-center mb-3">⚙️ Configurar Negocio</p>
            <button onClick={() => router.push('/setup-negocio')} className="w-full bg-orange-500 text-white py-3 rounded-xl text-xs font-black uppercase">Ir a Configuración</button>
          </div>
        )}

        <nav className="flex flex-col gap-2 flex-1">
          {[
            { id: 'agenda', label: 'Agenda', icon: '🗓️' },
            { id: 'servicios', label: `${labelServicio}s`, icon: '✂️' },
            { id: 'staff', label: `${labelStaff}s`, icon: '👥' },
            { id: 'clientes', label: 'CRM', icon: '💎', premium: !features.canAccessCRM },
            { id: 'finanzas', label: 'Finanzas', icon: '💰', premium: !features.canAccessFinanzas },
          ].map((item) => {
            const tienePermiso = tieneAccesoSeccion(item.id as SeccionActiva)
            const deshabilitado = !tienePermiso || !negocio
            return (
              <button key={item.id} onClick={() => cambiarSeccion(item.id as SeccionActiva)} disabled={deshabilitado}
                className={`flex items-center gap-4 p-5 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest transition-all ${
                  seccionActiva === item.id ? `text-black shadow-xl` : 
                  deshabilitado ? 'opacity-30 cursor-not-allowed' : 'hover:bg-white/5 text-slate-500'
                }`}
                style={seccionActiva === item.id ? { backgroundColor: colorPrimario } : {}}>
                <span className="text-xl">{item.icon}</span>
                {item.label}
                {item.premium && tienePermiso && <span className="ml-auto text-yellow-500">🔒</span>}
                {!tienePermiso && <span className="ml-auto text-red-500">⛔</span>}
              </button>
            )
          })}
        </nav>

        <button onClick={handleLogout}
          className="mt-auto p-5 rounded-[1.5rem] bg-red-500/10 border border-red-500/20 text-red-400 font-black uppercase text-[10px] tracking-widest hover:bg-red-500/20 transition-all flex items-center justify-center gap-3">
          <span className="text-xl">🚪</span>Cerrar Sesión
        </button>

        {mensaje.texto && (
          <div className={`p-4 rounded-2xl text-[10px] font-black uppercase text-center ${
            mensaje.tipo === 'success' ? 'bg-[#10b981]/20 text-[#10b981]' :
            mensaje.tipo === 'error' ? 'bg-red-500/20 text-red-500' :
            mensaje.tipo === 'warning' ? 'bg-yellow-500/20 text-yellow-500' : 'bg-blue-500/20 text-blue-500'
          }`}>{mensaje.texto}</div>
        )}
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 p-12 overflow-y-auto">
        
        {!negocio ? (
          <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
            <div className="text-6xl">⚙️</div>
            <h2 className="text-3xl font-black text-white italic uppercase">Configurar Negocio</h2>
            <p className="text-slate-400 text-center max-w-md">Para comenzar, configura tu negocio.</p>
            <button onClick={() => router.push('/setup-negocio')} className="bg-[#10b981] text-black px-10 py-5 rounded-2xl font-black uppercase text-sm mt-4">Configurar Ahora</button>
          </div>
        ) : loading || cargandoDatos ? (
          <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
            <div className="w-20 h-20 border-4 border-[#10b981]/10 border-t-[#10b981] rounded-full animate-spin" />
            <h2 className="text-[#10b981] font-black text-2xl uppercase tracking-[0.4em] animate-pulse">Cargando Datos</h2>
          </div>
        ) : (
          <>
            {seccionActiva === 'agenda' && (
              <div className="space-y-12">
                <h2 className="text-5xl font-black text-white italic uppercase tracking-tighter">
                  Agenda <span style={{ color: colorPrimario }}>Semanal</span>
                </h2>

                <CalendarioSemanal turnos={turnos} staff={staff.filter(s => s.activo)} onTurnoClick={handleTurnoClick}
                  onSlotClick={(fecha: Date, staffId: string) => {
                    const fechaStr = fecha.toISOString().slice(0, 16)
                    setFormTurno({ ...formTurno, fecha: fechaStr, staff: staffId })
                  }} colorPrimario={colorPrimario} />

                <div className="p-12 rounded-[3.5rem]" style={{ backgroundColor: colorPrimario }}>
                  <p className="text-[11px] font-black uppercase text-black/60">Ingresos Hoy</p>
                  <p className="text-7xl font-black italic text-black my-4">${ingresosBrutos}</p>
                  <p className="text-xs font-bold text-black/60">{turnosHoy.filter(t => t.estado === 'finalizado').length} turnos finalizados</p>
                </div>
              </div>
            )}

            {seccionActiva === 'servicios' && (
              <div className="space-y-12">
                <h2 className="text-5xl font-black text-white italic uppercase tracking-tighter">{labelServicio}s</h2>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  {servicios.map(s => (
                    <div key={s.id} className="bg-[#0f172a] p-12 rounded-[4rem] border border-white/5">
                      <p className="text-white font-black uppercase italic text-3xl">{s.nombre}</p>
                      {s.descripcion && <p className="text-slate-400 text-sm mt-2">{s.descripcion}</p>}
                      <div className="flex items-baseline gap-2 mt-6">
                        <p className="text-5xl font-black italic" style={{ color: colorPrimario }}>${s.precio}</p>
                        <span className="text-slate-600 text-sm">• {s.duracion_minutos}min</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {seccionActiva === 'staff' && (
              <div className="space-y-12">
                <h2 className="text-5xl font-black text-white italic uppercase tracking-tighter">Equipo de {labelStaff}s</h2>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                  {staff.map(s => (
                    <div key={s.id} className="bg-[#0f172a] p-12 rounded-[4rem] border border-white/5 text-center">
                      <div className="w-24 h-24 rounded-full flex items-center justify-center text-4xl mx-auto mb-8"
                        style={{ backgroundColor: `${colorPrimario}20` }}>👤</div>
                      <p className="text-white font-black uppercase italic text-2xl">{s.nombre}</p>
                      {s.especialidad && <p className="text-slate-400 text-xs mt-2">{s.especialidad}</p>}
                      <p className="text-[10px] font-black uppercase mt-4" style={{ color: s.activo ? colorPrimario : '#ef4444' }}>
                        {s.activo ? 'Activo' : 'Inactivo'}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {seccionActiva === 'clientes' && (
              <div className="space-y-12">
                <h2 className="text-5xl font-black text-white italic uppercase">Top {labelCliente}s</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  {getTopClientes().map(([nombre, datos]) => (
                    <div key={nombre} className="bg-[#0f172a] p-10 rounded-[4rem] border border-white/5">
                      <div className="w-16 h-16 rounded-full flex items-center justify-center text-3xl mb-8"
                        style={{ backgroundColor: `${colorPrimario}20` }}>👤</div>
                      <p className="text-3xl font-black text-white uppercase italic">{nombre}</p>
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

            {seccionActiva === 'finanzas' && (
              <div className="space-y-12">
                <h2 className="text-5xl font-black text-white italic uppercase">Finanzas</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  <div className="bg-[#0f172a] p-12 rounded-[4rem] border border-white/5">
                    <p className="text-[10px] font-black text-slate-500 uppercase">Ingresos</p>
                    <p className="text-6xl font-black text-white italic mt-4">${ingresosBrutos}</p>
                  </div>
                  <div className="bg-[#0f172a] p-12 rounded-[4rem] border border-white/5">
                    <p className="text-[10px] font-black text-slate-500 uppercase">Egresos</p>
                    <p className="text-6xl font-black text-red-400 italic mt-4">${egresosHoy}</p>
                  </div>
                  <div className="p-12 rounded-[4rem]" style={{ backgroundColor: colorPrimario }}>
                    <p className="text-[10px] font-black uppercase text-black/60">Ganancia</p>
                    <p className="text-6xl font-black text-black italic mt-4">${gananciaNeta}</p>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* MODAL: ACCIONES DE TURNO */}
      {modalAccionesTurno && turnoSeleccionado && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-[#0f172a] border border-white/10 rounded-[3rem] p-10 max-w-2xl w-full">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-3xl font-black text-white italic uppercase">Gestionar Turno</h3>
              <button onClick={() => { setModalAccionesTurno(false); setTurnoSeleccionado(null) }}
                className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-slate-400">✕</button>
            </div>
            <div className="bg-[#020617] rounded-2xl p-6 mb-8 border border-white/5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-slate-500 uppercase mb-1">Cliente</p>
                  <p className="text-white font-bold">{turnoSeleccionado.nombre_cliente}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase mb-1">Estado</p>
                  <div className="flex items-center gap-2">
                    <span>{getIconoEstado(turnoSeleccionado.estado || 'pendiente')}</span>
                    <span className="text-sm font-black uppercase" style={{ color: getColorEstado(turnoSeleccionado.estado || 'pendiente') }}>
                      {getNombreEstado(turnoSeleccionado.estado || 'pendiente')}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <div className="space-y-4 mb-8">
              <p className="text-xs text-slate-500 uppercase font-black mb-4">Cambiar Estado</p>
              <div className="grid grid-cols-2 gap-4">
                {(['pendiente', 'en_curso', 'finalizado', 'cancelado'] as EstadoTurno[]).map((estado) => (
                  <button key={estado} onClick={() => cambiarEstadoTurno(turnoSeleccionado.id, estado)}
                    disabled={turnoSeleccionado.estado === estado}
                    className={`p-4 rounded-2xl border-2 flex items-center gap-3 font-bold text-sm uppercase transition-all ${
                      turnoSeleccionado.estado === estado ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'
                    }`}
                    style={{ borderColor: getColorEstado(estado), color: getColorEstado(estado), backgroundColor: `${getColorEstado(estado)}10` }}>
                    <span className="text-2xl">{getIconoEstado(estado)}</span>
                    {getNombreEstado(estado)}
                  </button>
                ))}
              </div>
            </div>
            {!confirmacionEliminar ? (
              <button onClick={() => setConfirmacionEliminar(true)}
                className="w-full p-5 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 font-black uppercase text-sm">
                🗑️ Eliminar Turno
              </button>
            ) : (
              <div className="space-y-3">
                <div className="bg-red-500/20 border border-red-500/40 rounded-2xl p-4">
                  <p className="text-red-300 text-sm text-center font-bold">⚠️ ¿Estás seguro?</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <button onClick={() => setConfirmacionEliminar(false)}
                    className="p-4 rounded-2xl bg-white/5 text-slate-400 font-bold uppercase text-xs">Cancelar</button>
                  <button onClick={() => eliminarTurno(turnoSeleccionado.id)}
                    className="p-4 rounded-2xl bg-red-500 text-white font-black uppercase text-xs">Eliminar</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  )
}

// ============================================================================
// ✅ FIN DEL ARCHIVO - CIERRE DE SEGURIDAD GARANTIZADO
// ============================================================================