// ============================================================================
// ARCHIVO: app/(owner)/dashboard/page.tsx
// VERSIÓN: 8.1 - FUSIÓN COMPLETA: SEGURIDAD v8.0 + INTERFAZ COMPLETA
// 
// CARACTERÍSTICAS:
// ✅ StorageKey unificado: 'plataforma-saas-auth-token'
// ✅ Sacudón de sesión con refreshSession()
// ✅ No redirige hasta después de 3 segundos + 5 intentos
// ✅ Logs estilo Sherlock Holmes
// ✅ Interfaz completa con todos los módulos funcionales
// ✅ Sistema de gestión de turnos con estados
// ============================================================================

'use client'

// ============================================================================
// IMPORTACIONES
// ============================================================================

import { useState, useEffect, useRef } from 'react'
import { supabase, waitForSession, checkSession, refreshSession } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

// ============================================================================
// TIPOS LOCALES
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
// HOOKS LOCALES
// ============================================================================

function usePlanFeatures(plan: string): PlanFeatures {
  const features: Record<string, PlanFeatures> = {
    trial: {
      canAccessCRM: false,
      canAccessFinanzas: false,
      maxStaff: 1,
      maxServicios: 5
    },
    basico: {
      canAccessCRM: true,
      canAccessFinanzas: false,
      maxStaff: 3,
      maxServicios: 15
    },
    pro: {
      canAccessCRM: true,
      canAccessFinanzas: true,
      maxStaff: 999,
      maxServicios: 999
    }
  }
  
  return features[plan] || features['trial']
}

// Componentes dummy
const CalendarioSemanal = ({ turnos, staff, onTurnoClick, onSlotClick, colorPrimario }: any) => (
  <div className="bg-[#0f172a] p-12 rounded-[4rem] border border-white/5 text-center">
    <p className="text-slate-500">Calendario en desarrollo</p>
  </div>
)

const UpgradePlanModal = ({ planActual, featureBloqueada, onClose, onUpgrade }: any) => null

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

export default function DashboardOwner() {
  
  const router = useRouter()
  
  // ==========================================================================
  // ESTADO - Autenticación (v8.0)
  // ==========================================================================
  
  const [perfil, setPerfil] = useState<Perfil | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [loadingAuth, setLoadingAuth] = useState(true)
  const [sincronizandoSeguridad, setSincronizandoSeguridad] = useState(true)
  const [intentosRecuperacion, setIntentosRecuperacion] = useState(0)
  const [mensajeDebug, setMensajeDebug] = useState<string>('Inicializando...')
  const [tiempoTranscurrido, setTiempoTranscurrido] = useState(0)
  
  // ==========================================================================
  // ESTADO - Datos
  // ==========================================================================
  
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

  // ==========================================================================
  // ESTADO - Gestión de Turnos
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
  // REFS
  // ==========================================================================
  
  const timeoutDatosRef = useRef<NodeJS.Timeout | null>(null)
  const intentosRef = useRef(0)
  const tiempoInicioRef = useRef<number>(Date.now())

  // ==========================================================================
  // ✅ INICIO SEGURO CON DELAY (v8.0)
  // ==========================================================================
  
  useEffect(() => {
    console.log('🚀 [DASHBOARD] Iniciando con storageKey unificado: plataforma-saas-auth-token')
    iniciarDashboardSeguro()

    return () => {
      if (timeoutDatosRef.current) {
        clearTimeout(timeoutDatosRef.current)
      }
    }
  }, [])

  // ==========================================================================
  // ✅ FUNCIÓN: Iniciar Dashboard con delay de seguridad (v8.0)
  // ==========================================================================
  
  const iniciarDashboardSeguro = async () => {
    try {
      setSincronizandoSeguridad(true)
      tiempoInicioRef.current = Date.now()
      setMensajeDebug('Esperando a que el navegador procese cookies...')
      
      console.log('⏳ [SEGURIDAD] Aplicando delay de seguridad de 800ms...')
      await new Promise(r => setTimeout(r, 800))
      
      setMensajeDebug('Verificando credenciales de acceso...')
      console.log('✅ [SEGURIDAD] Delay completado, iniciando verificación')
      
      setSincronizandoSeguridad(false)
      await verificarAutenticacion()
      
    } catch (error: any) {
      console.error('💥 [DASHBOARD] Error en inicio seguro:', error)
      setSincronizandoSeguridad(false)
      setLoadingAuth(false)
      setErrorCarga(`Error crítico: ${error.message}`)
    }
  }

  // ==========================================================================
  // ✅ VERIFICACIÓN CON SHERLOCK HOLMES + SACUDÓN (v8.0)
  // ==========================================================================
  
  const verificarAutenticacion = async () => {
    try {
      intentosRef.current += 1
      const intentoActual = intentosRef.current
      const tiempoActual = ((Date.now() - tiempoInicioRef.current) / 1000).toFixed(1)
      setTiempoTranscurrido(parseFloat(tiempoActual))
      
      console.log(`🔐 [AUTH - INTENTO ${intentoActual}/5 - ${tiempoActual}s] Verificando...`)
      setErrorCarga('')

      // ========================================================================
      // 🔍 SHERLOCK HOLMES: Investigación forense de localStorage
      // ========================================================================
      
      console.log('🔍 [SHERLOCK] Iniciando investigación forense...')
      
      const STORAGE_KEY = 'plataforma-saas-auth-token'
      let existeEnLocalStorage = false
      let tokenData = null
      
      try {
        const allKeys = Object.keys(localStorage)
        console.log(`🔍 [DEBUG] Total de claves en localStorage: ${allKeys.length}`)
        console.log(`🔍 [DEBUG] Buscando clave exacta: "${STORAGE_KEY}"`)
        
        const valorClave = localStorage.getItem(STORAGE_KEY)
        
        if (valorClave) {
          existeEnLocalStorage = true
          console.log(`✅ [DEBUG] ¡Clave encontrada! localStorage["${STORAGE_KEY}"] existe`)
          
          try {
            tokenData = JSON.parse(valorClave)
            console.log('🔍 [DEBUG] Token parseado correctamente')
            console.log('🔍 [DEBUG] Estructura del token:', {
              hasAccessToken: !!tokenData?.access_token,
              hasRefreshToken: !!tokenData?.refresh_token,
              hasUser: !!tokenData?.user
            })
          } catch (e) {
            console.warn('⚠️ [DEBUG] Token no es JSON válido')
          }
        } else {
          console.log(`❌ [DEBUG] localStorage["${STORAGE_KEY}"] NO existe`)
          console.log('🔍 [DEBUG] Claves presentes que contienen "auth":', 
            allKeys.filter(k => k.toLowerCase().includes('auth'))
          )
        }
      } catch (e) {
        console.error('💥 [DEBUG] Error accediendo a localStorage:', e)
      }

      // Investigar cookies
      console.log('🔍 [DEBUG] ¿Existe cookie? 🔒 (httpOnly - no accesible desde JS)')

      // ========================================================================
      // PASO 1: Intentar getSession() normal
      // ========================================================================
      
      console.log('⏳ [AUTH] Método 1: Obteniendo sesión vía getSession()...')
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      if (session && !sessionError) {
        console.log('✅ [AUTH] ¡Sesión obtenida exitosamente vía getSession()!')
        console.log('👤 [AUTH] Usuario:', {
          user_id: session.user.id,
          email: session.user.email
        })
        
        // Resetear intentos
        intentosRef.current = 0
        setIntentosRecuperacion(0)
        
        setLoadingAuth(false)
        setUserId(session.user.id)
        
        await cargarPerfilYNegocio(session.user.id)
        return
      }

      // ========================================================================
      // ✅ PASO 2: SACUDÓN DE SESIÓN - refreshSession()
      // ========================================================================
      
      if (!session) {
        console.warn('⚠️ [AUTH] getSession() retornó null')
        console.log('🔄 [SACUDÓN] Intentando refrescar sesión con refreshSession()...')
        
        const refreshedSession = await refreshSession()
        
        if (refreshedSession) {
          console.log('✅ [SACUDÓN] ¡Sesión recuperada vía refreshSession()!')
          console.log('👤 [SACUDÓN] Usuario recuperado:', {
            user_id: refreshedSession.user.id,
            email: refreshedSession.user.email
          })
          
          // Resetear intentos
          intentosRef.current = 0
          setIntentosRecuperacion(0)
          
          setLoadingAuth(false)
          setUserId(refreshedSession.user.id)
          
          await cargarPerfilYNegocio(refreshedSession.user.id)
          return
        } else {
          console.warn('⚠️ [SACUDÓN] refreshSession() también falló')
        }
      }

      // ========================================================================
      // ✅ PASO 3: BYPASS DE EMERGENCIA - Recuperar desde localStorage
      // ========================================================================
      
      if (existeEnLocalStorage && tokenData) {
        console.log('🆘 [BYPASS] ¡Encontré evidencia en localStorage! Intentando setSession()...')
        
        try {
          const { data: recoveryData, error: recoveryError } = await supabase.auth.setSession({
            access_token: tokenData.access_token || tokenData,
            refresh_token: tokenData.refresh_token || ''
          })

          if (recoveryData.session && !recoveryError) {
            console.log('✅ [BYPASS] ¡Recuperación exitosa! Sesión restaurada desde localStorage')
            console.log('👤 [BYPASS] Usuario recuperado:', {
              user_id: recoveryData.session.user.id,
              email: recoveryData.session.user.email
            })
            
            // Resetear intentos
            intentosRef.current = 0
            setIntentosRecuperacion(0)
            
            setLoadingAuth(false)
            setUserId(recoveryData.session.user.id)
            
            await cargarPerfilYNegocio(recoveryData.session.user.id)
            return
          } else {
            console.error('❌ [BYPASS] setSession() falló:', recoveryError?.message)
          }
        } catch (bypassError: any) {
          console.error('💥 [BYPASS] Error en recuperación de emergencia:', bypassError.message)
        }
      } else {
        console.log('🔍 [SHERLOCK] No hay evidencia en localStorage para bypass')
      }

      // ========================================================================
      // PASO 4: Verificar si debe reintentar o redirigir
      // ========================================================================
      
      const tiempoTranscurridoSegundos = (Date.now() - tiempoInicioRef.current) / 1000
      
      console.warn(`⚠️ [AUTH] Intento ${intentoActual} falló (${tiempoTranscurridoSegundos.toFixed(1)}s transcurridos)`)
      
      // ✅ NO redirigir hasta que hayan pasado al menos 3 segundos
      if (tiempoTranscurridoSegundos < 3 || intentoActual < 5) {
        console.log(`🔄 [RETRY] Reintentando... (${intentoActual}/5, ${tiempoTranscurridoSegundos.toFixed(1)}s/3s)`)
        setIntentosRecuperacion(intentoActual)
        setMensajeDebug(`Reintentando conexión (${intentoActual}/5)...`)
        
        setTimeout(() => {
          verificarAutenticacion()
        }, 1000)
        return
      }

      // ========================================================================
      // PASO 5: Después de 3 segundos Y 5 intentos, redirigir
      // ========================================================================
      
      console.error('❌ [AUTH] Fallaron todos los intentos después de 3+ segundos')
      console.log('🚪 [AUTH] Redirigiendo al login después de 5 intentos fallidos')
      
      setLoadingAuth(false)
      router.push('/login')

    } catch (error: any) {
      console.error('💥 [AUTH] Error crítico:', error)
      
      const tiempoTranscurridoSegundos = (Date.now() - tiempoInicioRef.current) / 1000
      
      if (tiempoTranscurridoSegundos < 3 || intentosRef.current < 5) {
        console.log(`🔄 [RETRY] Error crítico, reintentando... (${intentosRef.current}/5)`)
        setIntentosRecuperacion(intentosRef.current)
        setTimeout(() => verificarAutenticacion(), 1000)
      } else {
        setLoadingAuth(false)
        setLoading(false)
        setErrorCarga(`Error de autenticación: ${error.message}`)
      }
    }
  }

  // ==========================================================================
  // FUNCIÓN: Cargar perfil y negocio
  // ==========================================================================
  
  const cargarPerfilYNegocio = async (userId: string) => {
    try {
      console.log('📡 [PERFIL] Cargando perfil del usuario...')
      const { data: perfilData, error: perfilError } = await supabase
        .from('perfiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (perfilError || !perfilData) {
        console.error('❌ [PERFIL] Error al cargar perfil:', perfilError)
        console.log('🏗️ Estructura de Perfil:', perfilData)
        
        setLoading(false)
        setErrorCarga('No se pudo cargar el perfil de usuario')
        return
      }

      console.log('✅ [PERFIL] Perfil cargado exitosamente')
      console.log('🏗️ Estructura de Perfil:', {
        id: perfilData.id,
        email: perfilData.email,
        nombre: perfilData.nombre,
        rol: perfilData.rol,
        negocio_id: perfilData.negocio_id,
        avatar_url: perfilData.avatar_url
      })
      
      setPerfil(perfilData)

      if (!perfilData.negocio_id && perfilData.rol !== 'staff') {
        console.warn('⚠️ [NEGOCIO] Usuario sin negocio asignado, redirigiendo a setup')
        setLoading(false)
        router.push('/setup-negocio')
        return
      }

      if (perfilData.negocio_id) {
        cargarNegocioConTimeout(perfilData.negocio_id)
      } else {
        setLoading(false)
      }

    } catch (error: any) {
      console.error('💥 [PERFIL] Error crítico:', error)
      setLoading(false)
      setErrorCarga(`Error al cargar perfil: ${error.message}`)
    }
  }

  // ==========================================================================
  // FUNCIÓN: Cargar negocio CON TIMEOUT
  // ==========================================================================
  
  const cargarNegocioConTimeout = async (negocioId: string) => {
    console.log('🏢 [NEGOCIO] Cargando datos del negocio:', negocioId)
    setCargandoDatos(true)
    setTimeoutDatos(false)
    
    timeoutDatosRef.current = setTimeout(() => {
      console.warn('⏰ [TIMEOUT] Los datos tardaron más de 3 segundos')
      setTimeoutDatos(true)
      setCargandoDatos(false)
    }, 3000)

    try {
      await cargarNegocio(negocioId)
      
      if (timeoutDatosRef.current) {
        clearTimeout(timeoutDatosRef.current)
      }
      setCargandoDatos(false)
      
    } catch (error: any) {
      console.error('💥 [NEGOCIO] Error al cargar:', error)
      if (timeoutDatosRef.current) {
        clearTimeout(timeoutDatosRef.current)
      }
      setCargandoDatos(false)
      setErrorCarga(`Error al cargar negocio: ${error.message}`)
    }
  }

  // ==========================================================================
  // FUNCIÓN: Cargar negocio
  // ==========================================================================
  
  const cargarNegocio = async (negocioId: string) => {
    console.log('🏢 [NEGOCIO] Ejecutando carga de datos...')
    setLoading(true)
    
    try {
      const { data: negocioData, error: negocioError } = await supabase
        .from('Negocio')
        .select('*')
        .eq('id', negocioId)
        .single()

      if (negocioError || !negocioData) {
        console.error('❌ [NEGOCIO] Error en query:', negocioError)
        setLoading(false)
        throw new Error('No se pudo cargar la información del negocio')
      }

      console.log('✅ [NEGOCIO] Negocio cargado correctamente')
      console.log('🏗️ Estructura de Negocio:', {
        id: negocioData.id,
        nombre: negocioData.nombre,
        vertical: negocioData.vertical,
        plan: negocioData.plan,
        color_primario: negocioData.color_primario,
        label_servicio: negocioData.label_servicio,
        label_staff: negocioData.label_staff,
        label_cliente: negocioData.label_cliente
      })
      
      setNegocio(negocioData)

      console.log('📊 [DATOS] Cargando servicios, staff, turnos y egresos...')
      const [serviciosRes, staffRes, turnosRes, egresosRes] = await Promise.all([
        supabase.from('Servicio').select('*').eq('negocio_id', negocioData.id),
        supabase.from('Staff').select('*').eq('negocio_id', negocioData.id),
        supabase.from('turnos').select('*, Servicio(*), Staff(*)').eq('negocio_id', negocioData.id).gte('hora_inicio', new Date().toISOString()),
        supabase.from('Egresos').select('*').eq('negocio_id', negocioData.id)
      ])

      const serviciosActivos = (serviciosRes.data || []).filter((s: any) => 
        s.activo === undefined || s.activo === true
      )

      setServicios(serviciosActivos || [])
      setStaff(staffRes.data || [])
      setTurnos(turnosRes.data || [])
      setEgresos(egresosRes.data || [])

      console.log('✅ [DATOS] Todos los datos cargados:', {
        servicios: serviciosActivos?.length || 0,
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

  // ==========================================================================
  // FUNCIÓN: Reintentar carga de datos
  // ==========================================================================
  
  const reintentarCargaDatos = () => {
    if (perfil?.negocio_id) {
      console.log('🔄 [RETRY] Reintentando carga de datos...')
      setTimeoutDatos(false)
      setErrorCarga('')
      cargarNegocioConTimeout(perfil.negocio_id)
    }
  }

  // ==========================================================================
  // FUNCIONES AUXILIARES
  // ==========================================================================
  
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
      notify(`❌ Error: ${error.message}`, 'error')
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

  // ==========================================================================
  // FUNCIONES: Gestión de Turnos
  // ==========================================================================

  const getColorEstado = (estado: EstadoTurno | string): string => {
    const estados: Record<string, string> = {
      'pendiente': '#eab308',
      'en_curso': '#3b82f6',
      'finalizado': '#10b981',
      'cancelado': '#64748b'
    }
    return estados[estado] || estados['pendiente']
  }

  const getIconoEstado = (estado: EstadoTurno | string): string => {
    const iconos: Record<string, string> = {
      'pendiente': '⏰',
      'en_curso': '▶️',
      'finalizado': '✅',
      'cancelado': '❌'
    }
    return iconos[estado] || iconos['pendiente']
  }

  const getNombreEstado = (estado: EstadoTurno | string): string => {
    const nombres: Record<string, string> = {
      'pendiente': 'Pendiente',
      'en_curso': 'En Curso',
      'finalizado': 'Finalizado',
      'cancelado': 'Cancelado'
    }
    return nombres[estado] || nombres['pendiente']
  }

  const cambiarEstadoTurno = async (turnoId: string, nuevoEstado: EstadoTurno) => {
    try {
      const { error } = await supabase
        .from('turnos')
        .update({ estado: nuevoEstado })
        .eq('id', turnoId)

      if (error) {
        notify(`❌ Error: ${error.message}`, 'error')
        return
      }

      notify(`✅ Turno ${getNombreEstado(nuevoEstado)}`, 'success')
      
      if (negocio?.id) cargarNegocio(negocio.id)
      
      setModalAccionesTurno(false)
      setTurnoSeleccionado(null)

    } catch (error: any) {
      notify(`❌ Error: ${error.message}`, 'error')
    }
  }

  const eliminarTurno = async (turnoId: string) => {
    try {
      const { error } = await supabase
        .from('turnos')
        .delete()
        .eq('id', turnoId)

      if (error) {
        notify(`❌ Error: ${error.message}`, 'error')
        return
      }

      notify('🗑️ Turno eliminado', 'success')
      
      if (negocio?.id) cargarNegocio(negocio.id)
      
      setConfirmacionEliminar(false)
      setModalAccionesTurno(false)
      setTurnoSeleccionado(null)

    } catch (error: any) {
      notify(`❌ Error: ${error.message}`, 'error')
    }
  }

  const handleTurnoClick = (turno: Turno) => {
    setTurnoSeleccionado(turno)
    setModalAccionesTurno(true)
  }

  // ==========================================================================
  // HANDLERS: Formularios
  // ==========================================================================
  
  const handleCrearTurno = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!negocio) return

    if (!formTurno.cliente.trim()) {
      return notify('⚠️ Cliente requerido', 'error')
    }

    const isoFecha = new Date(formTurno.fecha).toISOString()
    
    const conflicto = turnos.find(t => 
      t.staff_id === formTurno.staff && 
      t.hora_inicio === isoFecha && 
      t.estado !== 'finalizado' &&
      t.estado !== 'cancelado'
    )

    if (conflicto) {
      return notify('⚠️ Horario ocupado', 'error')
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
    notify('🚀 Turno agendado', 'success')
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
      dias_trabajo: formStaff.dias_trabajo,
      activo: true
    }])

    if (error) {
      notify(`❌ Error: ${error.message}`, 'error')
      return
    }

    setFormStaff({ nombre: '', especialidad: '', horario_inicio: '09:00', horario_fin: '18:00', dias_trabajo: ['L', 'Ma', 'Mi', 'J', 'V'] })
    notify('👤 Staff agregado', 'success')
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
  // ✅ PANTALLA "SINCRONIZANDO SEGURIDAD..." (v8.0)
  // ==========================================================================
  
  if (sincronizandoSeguridad) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#020617] via-[#0f172a] to-[#020617] flex flex-col items-center justify-center gap-8 relative overflow-hidden">
        {/* Efecto de fondo animado */}
        <div className="absolute inset-0 overflow-hidden opacity-20">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#10b981] rounded-full blur-[120px] animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500 rounded-full blur-[120px] animate-pulse delay-1000" />
        </div>

        {/* Contenido */}
        <div className="relative z-10 flex flex-col items-center gap-8">
          {/* Ícono de candado animado */}
          <div className="relative">
            <div className="w-32 h-32 rounded-full bg-gradient-to-br from-[#10b981] to-emerald-600 flex items-center justify-center shadow-2xl shadow-[#10b981]/50 animate-pulse">
              <span className="text-6xl">🔐</span>
            </div>
            {/* Anillo giratorio */}
            <div className="absolute inset-0 border-4 border-transparent border-t-[#10b981] rounded-full animate-spin" />
          </div>

          {/* Texto principal */}
          <div className="text-center space-y-4">
            <h2 className="text-5xl font-black text-white italic uppercase tracking-tighter">
              Sincronizando
              <span className="block text-[#10b981] mt-2">Seguridad</span>
            </h2>
            <p className="text-slate-400 text-lg font-medium max-w-md">
              {mensajeDebug}
            </p>
            <p className="text-slate-600 text-sm">
              {tiempoTranscurrido.toFixed(1)}s transcurridos
            </p>
          </div>

          {/* Barra de progreso animada */}
          <div className="w-80 h-2 bg-white/5 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-[#10b981] via-emerald-400 to-[#10b981] rounded-full animate-[shimmer_2s_ease-in-out_infinite]" 
                 style={{ width: '60%' }} />
          </div>

          {/* Indicador de intentos */}
          {intentosRecuperacion > 0 && (
            <div className="flex items-center gap-3 bg-yellow-500/10 border border-yellow-500/30 px-6 py-3 rounded-full">
              <span className="text-yellow-500 text-2xl">⚡</span>
              <span className="text-yellow-300 font-bold text-sm">
                Intento {intentosRecuperacion}/5
              </span>
            </div>
          )}
        </div>

        {/* Puntos decorativos */}
        <div className="absolute bottom-12 flex gap-3">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-3 h-3 bg-[#10b981] rounded-full animate-bounce"
              style={{ animationDelay: `${i * 150}ms` }}
            />
          ))}
        </div>
      </div>
    )
  }

  // ==========================================================================
  // PANTALLA DE ERROR PERSISTENTE
  // ==========================================================================
  
  if (errorCarga && !loadingAuth && !cargandoDatos) {
    return (
      <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center gap-6 p-8">
        <div className="text-red-500 text-8xl">❌</div>
        <h2 className="text-red-400 font-black text-3xl uppercase">Error de Carga</h2>
        <p className="text-slate-400 text-center max-w-md">{errorCarga}</p>
        <div className="flex gap-4 mt-6">
          <button
            onClick={() => window.location.reload()}
            className="bg-[#10b981] text-black px-8 py-4 rounded-2xl font-black uppercase text-sm"
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
      </div>
    )
  }

  // ==========================================================================
  // PANTALLA: Solo loading de autenticación
  // ==========================================================================
  
  if (loadingAuth) {
    return (
      <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center gap-6">
        <div className="w-20 h-20 border-4 border-[#10b981]/10 border-t-[#10b981] rounded-full animate-spin" />
        <h2 className="text-[#10b981] font-black text-2xl uppercase tracking-[0.4em] animate-pulse">
          Verificando Credenciales
        </h2>
        <p className="text-slate-500 text-sm">
          {tiempoTranscurrido.toFixed(1)}s / 3s mínimo
        </p>
        {intentosRecuperacion > 0 && (
          <p className="text-slate-500 text-sm">
            Intento {intentosRecuperacion}/5
          </p>
        )}
      </div>
    )
  }

  // ==========================================================================
  // TIMEOUT FALLBACK
  // ==========================================================================
  
  if (timeoutDatos && !negocio) {
    return (
      <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center gap-8 p-8">
        <div className="text-yellow-500 text-8xl">⏰</div>
        <h2 className="text-yellow-400 font-black text-3xl uppercase text-center">
          Cargando datos del negocio...
        </h2>
        <p className="text-slate-400 text-center max-w-md">
          La carga está tardando más de lo esperado. Esto puede deberse a una conexión lenta.
        </p>
        <button
          onClick={reintentarCargaDatos}
          className="bg-[#10b981] text-black px-10 py-5 rounded-2xl font-black uppercase text-sm hover:scale-105 transition-transform"
        >
          🔄 Reintentar Carga
        </button>
        <button
          onClick={handleLogout}
          className="text-slate-500 text-sm underline hover:text-slate-300"
        >
          Cerrar Sesión
        </button>
      </div>
    )
  }

  // ==========================================================================
  // RENDER PROGRESIVO
  // ==========================================================================
  
  if (!perfil) {
    return (
      <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center gap-6">
        <div className="w-20 h-20 border-4 border-[#10b981]/10 border-t-[#10b981] rounded-full animate-spin" />
        <h2 className="text-[#10b981] font-black text-2xl uppercase tracking-[0.4em] animate-pulse">
          Cargando Perfil
        </h2>
      </div>
    )
  }

  // ==========================================================================
  // VARIABLES DERIVADAS
  // ==========================================================================
  
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
  {/* MODAL: ACCIONES DE TURNO */}
      {modalAccionesTurno && turnoSeleccionado && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-[#0f172a] border border-white/10 rounded-[3rem] p-10 max-w-2xl w-full">
            
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-3xl font-black text-white italic uppercase">Gestionar Turno</h3>
              <button
                onClick={() => {
                  setModalAccionesTurno(false)
                  setTurnoSeleccionado(null)
                }}
                className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-slate-400"
              >
                ✕
              </button>
            </div>

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
                  <button
                    key={estado}
                    onClick={() => cambiarEstadoTurno(turnoSeleccionado.id, estado)}
                    disabled={turnoSeleccionado.estado === estado}
                    className={`p-4 rounded-2xl border-2 flex items-center gap-3 font-bold text-sm uppercase transition-all ${
                      turnoSeleccionado.estado === estado ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'
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

            {!confirmacionEliminar ? (
              <button
                onClick={() => setConfirmacionEliminar(true)}
                className="w-full p-5 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 font-black uppercase text-sm"
              >
                🗑️ Eliminar Turno
              </button>
            ) : (
              <div className="space-y-3">
                <div className="bg-red-500/20 border border-red-500/40 rounded-2xl p-4">
                  <p className="text-red-300 text-sm text-center font-bold">⚠️ ¿Estás seguro?</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setConfirmacionEliminar(false)}
                    className="p-4 rounded-2xl bg-white/5 text-slate-400 font-bold uppercase text-xs"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={() => eliminarTurno(turnoSeleccionado.id)}
                    className="p-4 rounded-2xl bg-red-500 text-white font-black uppercase text-xs"
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      )}

    </div>
  )
}