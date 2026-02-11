'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase, refreshSession } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

// ============================================================================
// 1. DEFINICIÓN DE TIPOS
// ============================================================================

type SeccionActiva = 'agenda' | 'servicios' | 'staff' | 'clientes' | 'finanzas' | 'configuracion' | 'superadmin'
type RolSistema = 'superadmin' | 'admin' | 'manager' | 'staff' | 'recepcionista'
type EstadoTurno = 'pendiente' | 'en_curso' | 'finalizado' | 'cancelado'

interface Perfil {
  id: string
  email: string
  nombre: string | null
  rol: RolSistema
  negocio_id: string | null
  avatar_url: string | null
}

interface Negocio {
  id: string
  nombre: string
  slug?: string
  vertical?: string
  label_servicio?: string
  label_staff?: string
  label_cliente?: string
  color_primario?: string
  plan?: 'trial' | 'basico' | 'pro'
  trial_ends_at?: string
  dueno_id?: string
  activo?: boolean
  created_at?: string
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

interface SlotCalendario {
  fecha: Date
  hora: string
  staffId: string
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

// Formularios
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

interface FormNuevoNegocio {
  nombre: string
  slug: string
  vertical: string
  dueno_email: string
}

// ============================================================================
// 2. UTILIDADES Y HOOKS
// ============================================================================

function usePlanFeatures(plan: string): PlanFeatures {
  const features: Record<string, PlanFeatures> = {
    trial: { canAccessCRM: false, canAccessFinanzas: false, maxStaff: 1, maxServicios: 5 },
    basico: { canAccessCRM: true, canAccessFinanzas: false, maxStaff: 3, maxServicios: 15 },
    pro: { canAccessCRM: true, canAccessFinanzas: true, maxStaff: 999, maxServicios: 999 }
  }
  return features[plan] || features['trial']
}

// ============================================================================
// 3. SUB-COMPONENTES (CALENDARIO Y PANEL ADMIN)
// ============================================================================

const CalendarioSemanal = ({ 
  turnos, 
  staff, 
  onTurnoClick, 
  onSlotClick, 
  colorPrimario 
}: {
  turnos: Turno[]
  staff: Staff[]
  onTurnoClick: (turno: Turno) => void
  onSlotClick: (slot: SlotCalendario) => void
  colorPrimario: string
}) => {
  const [fechaBase, setFechaBase] = useState(new Date())
  
  const obtenerSemana = () => {
    const hoy = new Date(fechaBase)
    const diaSemana = hoy.getDay()
    const diff = diaSemana === 0 ? -6 : 1 - diaSemana
    const lunes = new Date(hoy)
    lunes.setDate(hoy.getDate() + diff)
    
    const semana = []
    for (let i = 0; i < 6; i++) {
      const dia = new Date(lunes)
      dia.setDate(lunes.getDate() + i)
      semana.push(dia)
    }
    return semana
  }

  const semana = obtenerSemana()
  const horas = Array.from({ length: 27 }, (_, i) => {
    const hora = 8 + Math.floor(i / 2)
    const minutos = i % 2 === 0 ? '00' : '30'
    return `${hora.toString().padStart(2, '0')}:${minutos}`
  })

  const obtenerTurnosParaSlot = (fecha: Date, hora: string, staffId: string) => {
    const fechaStr = fecha.toISOString().split('T')[0]
    return turnos.filter(t => {
      const turnoFecha = new Date(t.hora_inicio)
      const turnoFechaStr = turnoFecha.toISOString().split('T')[0]
      const turnoHora = turnoFecha.toTimeString().slice(0, 5)
      return t.staff_id === staffId && turnoFechaStr === fechaStr && turnoHora === hora
    })
  }

  const navegarSemana = (direccion: 'anterior' | 'siguiente') => {
    const nuevaFecha = new Date(fechaBase)
    nuevaFecha.setDate(fechaBase.getDate() + (direccion === 'siguiente' ? 7 : -7))
    setFechaBase(nuevaFecha)
  }

  const getNombreDia = (fecha: Date) => {
    const dias = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
    return dias[fecha.getDay()]
  }

  const esHoy = (fecha: Date) => {
    const hoy = new Date()
    return fecha.toDateString() === hoy.toDateString()
  }

  return (
    <div className="bg-[#0f172a] rounded-[3rem] border border-white/5 overflow-hidden">
      <div className="p-8 border-b border-white/5 flex items-center justify-between">
        <div>
          <h3 className="text-3xl font-black text-white italic">
            {semana[0].toLocaleDateString('es', { month: 'long', year: 'numeric' })}
          </h3>
          <p className="text-slate-500 text-sm mt-1">
            {semana[0].toLocaleDateString('es', { day: 'numeric', month: 'short' })} - {' '}
            {semana[5].toLocaleDateString('es', { day: 'numeric', month: 'short' })}
          </p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => navegarSemana('anterior')}
            className="px-6 py-3 rounded-2xl bg-white/5 text-white font-bold hover:bg-white/10 transition-colors"
          >
            ← Anterior
          </button>
          <button 
            onClick={() => setFechaBase(new Date())}
            className="px-6 py-3 rounded-2xl bg-white/5 text-white font-bold hover:bg-white/10 transition-colors"
          >
            Hoy
          </button>
          <button 
            onClick={() => navegarSemana('siguiente')}
            className="px-6 py-3 rounded-2xl bg-white/5 text-white font-bold hover:bg-white/10 transition-colors"
          >
            Siguiente →
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[1200px]">
          <div className="grid grid-cols-7 border-b border-white/5 bg-[#020617]">
            <div className="p-4 text-center border-r border-white/5">
              <span className="text-xs text-slate-500 uppercase font-bold">Hora</span>
            </div>
            {semana.map((dia, idx) => (
              <div 
                key={idx} 
                className={`p-4 text-center border-r border-white/5 ${esHoy(dia) ? 'bg-white/5' : ''}`}
              >
                <div className="text-xs text-slate-500 uppercase font-bold">
                  {getNombreDia(dia)}
                </div>
                <div className={`text-2xl font-black mt-1 ${esHoy(dia) ? 'text-white' : 'text-slate-400'}`}>
                  {dia.getDate()}
                </div>
              </div>
            ))}
          </div>

          <div className="relative">
            {horas.map((hora) => (
              <div key={hora} className="grid grid-cols-7 border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                <div className="p-3 text-center border-r border-white/5 bg-[#020617]">
                  <span className="text-xs text-slate-500 font-mono">{hora}</span>
                </div>
                
                {semana.map((dia, diaIdx) => {
                  const staffActivo = staff.filter(s => s.activo)
                  
                  return (
                    <div key={diaIdx} className="border-r border-white/5 min-h-[80px]">
                      {staffActivo.length === 0 ? (
                        <button
                          onClick={() => onSlotClick({ fecha: dia, hora, staffId: '' })}
                          className="w-full h-full p-2 hover:bg-white/5 transition-colors text-left"
                        >
                          <span className="text-xs text-slate-600">Sin staff</span>
                        </button>
                      ) : (
                        <div className="grid gap-1 p-1" style={{ gridTemplateColumns: `repeat(${staffActivo.length}, 1fr)` }}>
                          {staffActivo.map(s => {
                            const turnosSlot = obtenerTurnosParaSlot(dia, hora, s.id)
                            
                            if (turnosSlot.length > 0) {
                              return turnosSlot.map(turno => (
                                <button
                                  key={turno.id}
                                  onClick={() => onTurnoClick(turno)}
                                  className="text-left p-2 rounded-lg text-xs font-bold transition-transform hover:scale-105 shadow-lg"
                                  style={{ 
                                    backgroundColor: colorPrimario,
                                    color: '#000'
                                  }}
                                >
                                  <div className="truncate">{turno.nombre_cliente}</div>
                                  <div className="text-[10px] opacity-60 truncate mt-1">
                                    {turno.Servicio?.nombre || 'Sin servicio'}
                                  </div>
                                </button>
                              ))
                            }
                            
                            return (
                              <button
                                key={s.id}
                                onClick={() => onSlotClick({ fecha: dia, hora, staffId: s.id })}
                                className="h-full hover:bg-white/5 transition-colors rounded-lg"
                                title={s.nombre}
                              />
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {staff.filter(s => s.activo).length > 0 && (
        <div className="p-6 border-t border-white/5 bg-[#020617]">
          <div className="flex flex-wrap gap-3">
            {staff.filter(s => s.activo).map(s => (
              <div key={s.id} className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: colorPrimario }} />
                <span className="text-xs font-bold text-slate-300">{s.nombre}</span>
                {s.especialidad && (
                  <span className="text-[10px] text-slate-500">• {s.especialidad}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

const PanelSuperadmin = ({ 
  todosLosNegocios, 
  onCrearNegocio,
  colorPrimario 
}: {
  todosLosNegocios: Negocio[]
  onCrearNegocio: () => void
  colorPrimario: string
}) => {
  const negociosActivos = todosLosNegocios.filter(n => n.activo !== false)
  const totalIngresos = 0

  return (
    <div className="space-y-12">
      <div className="flex items-center justify-between">
        <h2 className="text-5xl font-black text-white italic uppercase tracking-tighter">
          Panel <span style={{ color: colorPrimario }}>Superadmin</span>
        </h2>
        <button
          onClick={onCrearNegocio}
          className="px-8 py-4 rounded-2xl font-black uppercase text-sm flex items-center gap-3 hover:scale-105 transition-transform"
          style={{ backgroundColor: colorPrimario, color: '#000' }}
        >
          <span className="text-2xl">+</span>
          Crear Nuevo Negocio
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="bg-[#0f172a] p-12 rounded-[4rem] border border-white/5">
          <p className="text-[10px] font-black text-slate-500 uppercase mb-3">Total Negocios</p>
          <p className="text-7xl font-black text-white italic">{todosLosNegocios.length}</p>
          <p className="text-sm text-slate-500 mt-3">{negociosActivos.length} activos</p>
        </div>

        <div className="bg-[#0f172a] p-12 rounded-[4rem] border border-white/5">
          <p className="text-[10px] font-black text-slate-500 uppercase mb-3">Ingresos Plataforma</p>
          <p className="text-7xl font-black italic" style={{ color: colorPrimario }}>${totalIngresos}</p>
          <p className="text-sm text-slate-500 mt-3">Total facturado</p>
        </div>

        <div className="bg-[#0f172a] p-12 rounded-[4rem] border border-white/5">
          <p className="text-[10px] font-black text-slate-500 uppercase mb-3">Planes</p>
          <div className="space-y-2 mt-4">
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Trial:</span>
              <span className="text-white font-bold">
                {todosLosNegocios.filter(n => n.plan === 'trial').length}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Básico:</span>
              <span className="text-white font-bold">
                {todosLosNegocios.filter(n => n.plan === 'basico').length}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Pro:</span>
              <span className="text-white font-bold">
                {todosLosNegocios.filter(n => n.plan === 'pro').length}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-[#0f172a] rounded-[3rem] border border-white/5 overflow-hidden">
        <div className="p-8 border-b border-white/5">
          <h3 className="text-2xl font-black text-white italic uppercase">Todos los Negocios</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[#020617] border-b border-white/5">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-black uppercase text-slate-500">Negocio</th>
                <th className="px-6 py-4 text-left text-xs font-black uppercase text-slate-500">Slug</th>
                <th className="px-6 py-4 text-left text-xs font-black uppercase text-slate-500">Vertical</th>
                <th className="px-6 py-4 text-left text-xs font-black uppercase text-slate-500">Plan</th>
                <th className="px-6 py-4 text-left text-xs font-black uppercase text-slate-500">Estado</th>
              </tr>
            </thead>
            <tbody>
              {todosLosNegocios.map(negocio => (
                <tr key={negocio.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-black font-black text-lg"
                        style={{ backgroundColor: negocio.color_primario || colorPrimario }}
                      >
                        {negocio.nombre.charAt(0)}
                      </div>
                      <div>
                        <p className="text-white font-bold">{negocio.nombre}</p>
                        <p className="text-xs text-slate-500">{negocio.id.slice(0, 8)}...</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-slate-400 font-mono">{negocio.slug || 'Sin slug'}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-slate-300">{negocio.vertical || 'General'}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span 
                      className="px-3 py-1 rounded-full text-xs font-black uppercase"
                      style={{
                        backgroundColor: negocio.plan === 'pro' ? '#10b981' : negocio.plan === 'basico' ? '#3b82f6' : '#eab308',
                        color: '#000'
                      }}
                    >
                      {negocio.plan || 'trial'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span 
                      className="px-3 py-1 rounded-full text-xs font-black uppercase"
                      style={{
                        backgroundColor: negocio.activo !== false ? '#10b98120' : '#ef444420',
                        color: negocio.activo !== false ? '#10b981' : '#ef4444'
                      }}
                    >
                      {negocio.activo !== false ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// 4. COMPONENTE PRINCIPAL (DASHBOARD)
// ============================================================================

export default function DashboardOwner() {
  
  const router = useRouter()
  
  const [perfil, setPerfil] = useState<Perfil | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [loadingAuth, setLoadingAuth] = useState(true)
  const [sincronizandoSeguridad, setSincronizandoSeguridad] = useState(true)
  const [intentosRecuperacion, setIntentosRecuperacion] = useState(0)
  const [mensajeDebug, setMensajeDebug] = useState<string>('Inicializando...')
  const [tiempoTranscurrido, setTiempoTranscurrido] = useState(0)
  
  const [negocio, setNegocio] = useState<Negocio | null>(null)
  const [todosLosNegocios, setTodosLosNegocios] = useState<Negocio[]>([])
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
  const [modalNuevoTurno, setModalNuevoTurno] = useState(false)
  const [modalNuevoServicio, setModalNuevoServicio] = useState(false)
  const [modalNuevoStaff, setModalNuevoStaff] = useState(false)
  const [modalNuevoNegocio, setModalNuevoNegocio] = useState(false)
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
  const [formNuevoNegocio, setFormNuevoNegocio] = useState<FormNuevoNegocio>({
    nombre: '', slug: '', vertical: 'barberia', dueno_email: ''
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
    console.log('🚀 [DASHBOARD] Iniciando...')
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
      
      await new Promise(r => setTimeout(r, 800))
      
      setMensajeDebug('Verificando credenciales...')
      
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
      
      setErrorCarga('')

      const STORAGE_KEY = 'plataforma-saas-auth-token'
      let existeEnLocalStorage = false
      let tokenData = null
      
      try {
        const valorClave = localStorage.getItem(STORAGE_KEY)
        if (valorClave) {
          existeEnLocalStorage = true
          try {
            tokenData = JSON.parse(valorClave)
          } catch (e) {
            console.warn('⚠️ Token no es JSON')
          }
        }
      } catch (e) {
        console.error('💥 Error localStorage:', e)
      }

      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      if (session && !sessionError) {
        intentosRef.current = 0
        setIntentosRecuperacion(0)
        setLoadingAuth(false)
        setUserId(session.user.id)
        
        await cargarPerfilYNegocio(session.user.id)
        return
      }

      if (!session) {
        const refreshedSession = await refreshSession()
        
        if (refreshedSession) {
          intentosRef.current = 0
          setIntentosRecuperacion(0)
          setLoadingAuth(false)
          setUserId(refreshedSession.user.id)
          
          await cargarPerfilYNegocio(refreshedSession.user.id)
          return
        }
      }

      if (existeEnLocalStorage && tokenData) {
        try {
          const { data: recoveryData, error: recoveryError } = await supabase.auth.setSession({
            access_token: tokenData.access_token || tokenData,
            refresh_token: tokenData.refresh_token || ''
          })

          if (recoveryData.session && !recoveryError) {
            intentosRef.current = 0
            setIntentosRecuperacion(0)
            setLoadingAuth(false)
            setUserId(recoveryData.session.user.id)
            
            await cargarPerfilYNegocio(recoveryData.session.user.id)
            return
          }
        } catch (bypassError: any) {
          console.error('💥 BYPASS Error:', bypassError.message)
        }
      }

      const tiempoTranscurridoSegundos = (Date.now() - tiempoInicioRef.current) / 1000
      
      if (tiempoTranscurridoSegundos < 3 || intentoActual < 5) {
        setIntentosRecuperacion(intentoActual)
        setMensajeDebug(`Reintentando (${intentoActual}/5)...`)
        
        setTimeout(() => verificarAutenticacion(), 1000)
        return
      }

      setLoadingAuth(false)
      router.push('/login')

    } catch (error: any) {
      console.error('💥 AUTH Error crítico:', error)
      
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

  const cargarPerfilYNegocio = async (uid: string) => {
    try {
      const { data: perfilData, error: perfilError } = await supabase
        .from('perfiles')
        .select('*')
        .eq('id', uid)
        .single()

      if (perfilError || !perfilData) {
        setLoading(false)
        setErrorCarga('No se pudo cargar perfil')
        return
      }
      
      setPerfil(perfilData)

      if (perfilData.rol === 'superadmin') {
        await cargarTodosLosNegocios()
        setSeccionActiva('superadmin')
        setLoading(false)
        return
      }

      if (!perfilData.negocio_id) {
        if (perfilData.rol === 'staff') {
          setLoading(false)
          return
        }
        
        setLoading(false)
        router.push('/setup-negocio')
        return
      }

      cargarNegocioConTimeout(perfilData.negocio_id)

    } catch (error: any) {
      setLoading(false)
      setErrorCarga(`Error: ${error.message}`)
    }
  }

  const cargarTodosLosNegocios = async () => {
    try {
      const { data, error } = await supabase
        .from('Negocio')
        .select('*')
        .order('created_at', { ascending: false })

      if (!error) {
        setTodosLosNegocios(data || [])
      }
    } catch (error: any) {
      console.error('Error cargando negocios:', error)
    }
  }

  const cargarNegocioConTimeout = async (negocioId: string) => {
    setCargandoDatos(true)
    setTimeoutDatos(false)
    
    timeoutDatosRef.current = setTimeout(() => {
      setTimeoutDatos(true)
      setCargandoDatos(false)
    }, 5000)

    try {
      await cargarNegocio(negocioId)
      
      if (timeoutDatosRef.current) clearTimeout(timeoutDatosRef.current)
      setCargandoDatos(false)
      
    } catch (error: any) {
      if (timeoutDatosRef.current) clearTimeout(timeoutDatosRef.current)
      setCargandoDatos(false)
      setErrorCarga(`Error: ${error.message}`)
    }
  }

  const cargarNegocio = async (negocioId: string) => {
    setLoading(true)
    
    try {
      const { data: negocioData, error: negocioError } = await supabase
        .from('Negocio')
        .select('*')
        .eq('id', negocioId)
        .single()

      if (negocioError || !negocioData) {
        setLoading(false)
        throw new Error('No se pudo cargar negocio')
      }
      
      setNegocio(negocioData)

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

    } catch (error: any) {
      console.error('Error cargando negocio:', error)
      throw error
    } finally {
      setTimeout(() => setLoading(false), 300)
    }
  }

  const reintentarCargaDatos = () => {
    if (perfil?.negocio_id) {
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
      superadmin: ['superadmin', 'agenda', 'servicios', 'staff', 'clientes', 'finanzas', 'configuracion'],
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

  const handleSlotClick = (slot: SlotCalendario) => {
    const fechaISO = new Date(slot.fecha)
    const [hora, minutos] = slot.hora.split(':')
    fechaISO.setHours(parseInt(hora), parseInt(minutos))
    
    setFormTurno({
      ...formTurno,
      fecha: fechaISO.toISOString().slice(0, 16),
      staff: slot.staffId
    })
    setModalNuevoTurno(true)
  }

  const handleCrearTurno = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!negocio) return
    if (!formTurno.cliente.trim()) return notify('⚠️ Cliente requerido', 'error')
    if (!formTurno.servicio) return notify('⚠️ Selecciona un servicio', 'error')
    if (!formTurno.staff) return notify('⚠️ Selecciona un staff', 'error')
    if (!formTurno.fecha) return notify('⚠️ Selecciona fecha y hora', 'error')
    
    const isoFecha = new Date(formTurno.fecha).toISOString()
    const conflicto = turnos.find(t => 
      t.staff_id === formTurno.staff && t.hora_inicio === isoFecha && t.estado !== 'finalizado' && t.estado !== 'cancelado'
    )
    if (conflicto) return notify('⚠️ Horario ocupado', 'error')
    
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
      notify(`❌ ${error.message}`, 'error')
      return
    }
    
    setFormTurno({ cliente: '', telefono: '', email: '', servicio: '', staff: '', fecha: '', notas: '' })
    setModalNuevoTurno(false)
    notify('🚀 Turno agendado', 'success')
    if (negocio.id) cargarNegocio(negocio.id)
  }

  const handleCrearServicio = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!negocio) return
    if (!formServicio.nombre.trim()) return notify('⚠️ Nombre requerido', 'error')
    
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
      notify(`❌ ${error.message}`, 'error')
      return
    }
    
    setFormServicio({ nombre: '', descripcion: '', precio: '', duracion: '', ocultar_precio: false })
    setModalNuevoServicio(false)
    notify('✅ Servicio creado', 'success')
    if (negocio.id) cargarNegocio(negocio.id)
  }

  const handleCrearStaff = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!negocio) return
    if (!formStaff.nombre.trim()) return notify('⚠️ Nombre requerido', 'error')
    
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
      notify(`❌ ${error.message}`, 'error')
      return
    }
    
    setFormStaff({ 
      nombre: '', 
      especialidad: '', 
      horario_inicio: '09:00', 
      horario_fin: '18:00', 
      dias_trabajo: ['L', 'Ma', 'Mi', 'J', 'V'] 
    })
    setModalNuevoStaff(false)
    notify('👤 Staff agregado', 'success')
    if (negocio.id) cargarNegocio(negocio.id)
  }

  const handleCrearNegocio = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formNuevoNegocio.nombre.trim()) return notify('⚠️ Nombre requerido', 'error')
    if (!formNuevoNegocio.slug.trim()) return notify('⚠️ Slug requerido', 'error')
    if (!formNuevoNegocio.dueno_email.trim()) return notify('⚠️ Email del dueño requerido', 'error')

    try {
      const { data: perfilDueno, error: errorPerfil } = await supabase
        .from('perfiles')
        .select('id')
        .eq('email', formNuevoNegocio.dueno_email)
        .single()

      if (errorPerfil && errorPerfil.code !== 'PGRST116') {
        notify(`❌ Error buscando dueño: ${errorPerfil.message}`, 'error')
        return
      }

      let duenoId = perfilDueno?.id

      if (!duenoId) {
        notify('⚠️ El dueño debe registrarse primero en la plataforma', 'warning')
        return
      }

      const { data: nuevoNegocio, error: errorNegocio } = await supabase
        .from('Negocio')
        .insert([{
          nombre: formNuevoNegocio.nombre,
          slug: formNuevoNegocio.slug,
          vertical: formNuevoNegocio.vertical,
          dueno_id: duenoId,
          plan: 'trial',
          activo: true,
          trial_ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
        }])
        .select()
        .single()

      if (errorNegocio) {
        notify(`❌ ${errorNegocio.message}`, 'error')
        return
      }

      await supabase
        .from('perfiles')
        .update({ 
          negocio_id: nuevoNegocio.id,
          rol: 'admin'
        })
        .eq('id', duenoId)

      setFormNuevoNegocio({ nombre: '', slug: '', vertical: 'barberia', dueno_email: '' })
      setModalNuevoNegocio(false)
      notify('🎉 Negocio creado exitosamente', 'success')
      
      await cargarTodosLosNegocios()

    } catch (error: any) {
      notify(`❌ ${error.message}`, 'error')
    }
  }

  const rol = perfil?.rol || 'staff'
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
    const iconos: Record<RolSistema, string> = { 
      superadmin: '⚡', admin: '👑', manager: '📊', recepcionista: '💁', staff: '👤' 
    }
    return iconos[rolActual] || '👤'
  }

  const getNombreRol = (rolActual: RolSistema): string => {
    const nombres: Record<RolSistema, string> = { 
      superadmin: 'Superadmin', admin: 'Administrador', manager: 'Gerente', 
      recepcionista: 'Recepcionista', staff: 'Staff' 
    }
    return nombres[rolActual] || 'Usuario'
  }

  // ==========================================================================
  // 5. RENDERIZADO VISUAL
  // ==========================================================================

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
        <h2 className="text-[#10b981] font-black text-2xl uppercase tracking-[0.4em] animate-pulse">Verificando</h2>
        <p className="text-slate-500 text-sm">{tiempoTranscurrido.toFixed(1)}s / 3s mínimo</p>
      </div>
    )
  }

  if (timeoutDatos && !negocio && rol !== 'superadmin') {
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
        ) : rol === 'superadmin' ? (
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <span className="text-2xl">⚡</span>
            </div>
            <div>
              <h1 className="font-black italic text-white text-xl tracking-tighter uppercase">SuperAdmin</h1>
              <p className="text-[10px] text-slate-600 font-bold uppercase tracking-wider mt-1">Panel Global</p>
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

        {!negocio && rol !== 'superadmin' && (
          <div className="bg-orange-500/10 border border-orange-500/30 p-4 rounded-2xl">
            <p className="text-orange-300 text-xs font-black uppercase text-center mb-3">⚙️ Configurar Negocio</p>
            <button onClick={() => router.push('/setup-negocio')} className="w-full bg-orange-500 text-white py-3 rounded-xl text-xs font-black uppercase">Ir a Configuración</button>
          </div>
        )}

        <nav className="flex flex-col gap-2 flex-1">
          {rol === 'superadmin' && (
            <button 
              onClick={() => setSeccionActiva('superadmin')}
              className={`flex items-center gap-4 p-5 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest transition-all ${
                seccionActiva === 'superadmin' ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-black shadow-xl' : 
                'hover:bg-white/5 text-slate-500'
              }`}
            >
              <span className="text-xl">⚡</span>
              Panel Global
            </button>
          )}

          {(rol !== 'superadmin' || negocio) && [
            { id: 'agenda', label: 'Agenda', icon: '🗓️' },
            { id: 'servicios', label: `${labelServicio}s`, icon: '✂️' },
            { id: 'staff', label: `${labelStaff}s`, icon: '👥' },
            { id: 'clientes', label: 'CRM', icon: '💎', premium: !features.canAccessCRM },
            { id: 'finanzas', label: 'Finanzas', icon: '💰', premium: !features.canAccessFinanzas },
          ].map((item) => {
            const tienePermiso = tieneAccesoSeccion(item.id as SeccionActiva)
            const deshabilitado = !tienePermiso || (!negocio && rol !== 'superadmin')
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
        {rol === 'superadmin' && seccionActiva === 'superadmin' ? (
          <PanelSuperadmin 
            todosLosNegocios={todosLosNegocios}
            onCrearNegocio={() => setModalNuevoNegocio(true)}
            colorPrimario={colorPrimario}
          />
        ) : !negocio && rol !== 'superadmin' ? (
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
                <div className="flex items-center justify-between">
                  <h2 className="text-5xl font-black text-white italic uppercase tracking-tighter">
                    Agenda <span style={{ color: colorPrimario }}>Semanal</span>
                  </h2>
                  <button
                    onClick={() => setModalNuevoTurno(true)}
                    className="px-8 py-4 rounded-2xl font-black uppercase text-sm flex items-center gap-3 hover:scale-105 transition-transform"
                    style={{ backgroundColor: colorPrimario, color: '#000' }}
                  >
                    <span className="text-2xl">+</span>
                    Nuevo Turno
                  </button>
                </div>

                <CalendarioSemanal 
                  turnos={turnos} 
                  staff={staff.filter(s => s.activo)} 
                  onTurnoClick={handleTurnoClick}
                  onSlotClick={handleSlotClick}
                  colorPrimario={colorPrimario} 
                />

                <div className="p-12 rounded-[3.5rem]" style={{ backgroundColor: colorPrimario }}>
                  <p className="text-[11px] font-black uppercase text-black/60">Ingresos Hoy</p>
                  <p className="text-7xl font-black italic text-black my-4">${ingresosBrutos}</p>
                  <p className="text-xs font-bold text-black/60">{turnosHoy.filter(t => t.estado === 'finalizado').length} turnos finalizados</p>
                </div>
              </div>
            )}

            {seccionActiva === 'servicios' && (
              <div className="space-y-12">
                <div className="flex items-center justify-between">
                  <h2 className="text-5xl font-black text-white italic uppercase tracking-tighter">{labelServicio}s</h2>
                  <button
                    onClick={() => setModalNuevoServicio(true)}
                    className="px-8 py-4 rounded-2xl font-black uppercase text-sm flex items-center gap-3 hover:scale-105 transition-transform"
                    style={{ backgroundColor: colorPrimario, color: '#000' }}
                  >
                    <span className="text-2xl">+</span>
                    Nuevo {labelServicio}
                  </button>
                </div>
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
                <div className="flex items-center justify-between">
                  <h2 className="text-5xl font-black text-white italic uppercase tracking-tighter">Equipo de {labelStaff}s</h2>
                  <button
                    onClick={() => setModalNuevoStaff(true)}
                    className="px-8 py-4 rounded-2xl font-black uppercase text-sm flex items-center gap-3 hover:scale-105 transition-transform"
                    style={{ backgroundColor: colorPrimario, color: '#000' }}
                  >
                    <span className="text-2xl">+</span>
                    Nuevo {labelStaff}
                  </button>
                </div>
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

      {/* MODAL: NUEVO TURNO */}
      {modalNuevoTurno && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-[#0f172a] border border-white/10 rounded-[3rem] p-10 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-3xl font-black text-white italic uppercase">Nuevo Turno</h3>
              <button 
                onClick={() => {
                  setModalNuevoTurno(false)
                  setFormTurno({ cliente: '', telefono: '', email: '', servicio: '', staff: '', fecha: '', notas: '' })
                }}
                className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-slate-400 hover:bg-white/10"
              >
                ✕
              </button>
            </div>
            
            <form onSubmit={handleCrearTurno} className="space-y-6">
              <div>
                <label className="block text-xs font-black uppercase text-slate-500 mb-2">Cliente *</label>
                <input
                  type="text"
                  value={formTurno.cliente}
                  onChange={(e) => setFormTurno({ ...formTurno, cliente: e.target.value })}
                  className="w-full bg-[#020617] border border-white/10 rounded-2xl px-6 py-4 text-white focus:outline-none focus:border-white/30"
                  placeholder="Nombre del cliente"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black uppercase text-slate-500 mb-2">Teléfono</label>
                  <input
                    type="tel"
                    value={formTurno.telefono}
                    onChange={(e) => setFormTurno({ ...formTurno, telefono: e.target.value })}
                    className="w-full bg-[#020617] border border-white/10 rounded-2xl px-6 py-4 text-white focus:outline-none focus:border-white/30"
                    placeholder="Opcional"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black uppercase text-slate-500 mb-2">Email</label>
                  <input
                    type="email"
                    value={formTurno.email}
                    onChange={(e) => setFormTurno({ ...formTurno, email: e.target.value })}
                    className="w-full bg-[#020617] border border-white/10 rounded-2xl px-6 py-4 text-white focus:outline-none focus:border-white/30"
                    placeholder="Opcional"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-black uppercase text-slate-500 mb-2">Servicio *</label>
                <select
                  value={formTurno.servicio}
                  onChange={(e) => setFormTurno({ ...formTurno, servicio: e.target.value })}
                  className="w-full bg-[#020617] border border-white/10 rounded-2xl px-6 py-4 text-white focus:outline-none focus:border-white/30"
                  required
                >
                  <option value="">Selecciona un servicio</option>
                  {servicios.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.nombre} - ${s.precio} ({s.duracion_minutos}min)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-black uppercase text-slate-500 mb-2">Staff *</label>
                <select
                  value={formTurno.staff}
                  onChange={(e) => setFormTurno({ ...formTurno, staff: e.target.value })}
                  className="w-full bg-[#020617] border border-white/10 rounded-2xl px-6 py-4 text-white focus:outline-none focus:border-white/30"
                  required
                >
                  <option value="">Selecciona un staff</option>
                  {staff.filter(s => s.activo).map(s => (
                    <option key={s.id} value={s.id}>
                      {s.nombre} {s.especialidad && `- ${s.especialidad}`}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-black uppercase text-slate-500 mb-2">Fecha y Hora *</label>
                <input
                  type="datetime-local"
                  value={formTurno.fecha}
                  onChange={(e) => setFormTurno({ ...formTurno, fecha: e.target.value })}
                  className="w-full bg-[#020617] border border-white/10 rounded-2xl px-6 py-4 text-white focus:outline-none focus:border-white/30"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-black uppercase text-slate-500 mb-2">Notas Internas</label>
                <textarea
                  value={formTurno.notas}
                  onChange={(e) => setFormTurno({ ...formTurno, notas: e.target.value })}
                  className="w-full bg-[#020617] border border-white/10 rounded-2xl px-6 py-4 text-white focus:outline-none focus:border-white/30 min-h-[100px]"
                  placeholder="Notas opcionales..."
                />
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setModalNuevoTurno(false)
                    setFormTurno({ cliente: '', telefono: '', email: '', servicio: '', staff: '', fecha: '', notas: '' })
                  }}
                  className="flex-1 px-6 py-4 rounded-2xl bg-white/5 text-slate-400 font-bold uppercase text-sm hover:bg-white/10"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-6 py-4 rounded-2xl font-black uppercase text-sm hover:scale-105 transition-transform"
                  style={{ backgroundColor: colorPrimario, color: '#000' }}
                >
                  Crear Turno
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: NUEVO SERVICIO */}
      {modalNuevoServicio && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-[#0f172a] border border-white/10 rounded-[3rem] p-10 max-w-2xl w-full">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-3xl font-black text-white italic uppercase">Nuevo {labelServicio}</h3>
              <button 
                onClick={() => {
                  setModalNuevoServicio(false)
                  setFormServicio({ nombre: '', descripcion: '', precio: '', duracion: '', ocultar_precio: false })
                }}
                className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-slate-400 hover:bg-white/10"
              >
                ✕
              </button>
            </div>
            
            <form onSubmit={handleCrearServicio} className="space-y-6">
              <div>
                <label className="block text-xs font-black uppercase text-slate-500 mb-2">Nombre *</label>
                <input
                  type="text"
                  value={formServicio.nombre}
                  onChange={(e) => setFormServicio({ ...formServicio, nombre: e.target.value })}
                  className="w-full bg-[#020617] border border-white/10 rounded-2xl px-6 py-4 text-white focus:outline-none focus:border-white/30"
                  placeholder="Ej: Corte Premium"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-black uppercase text-slate-500 mb-2">Descripción</label>
                <input
                  type="text"
                  value={formServicio.descripcion}
                  onChange={(e) => setFormServicio({ ...formServicio, descripcion: e.target.value })}
                  className="w-full bg-[#020617] border border-white/10 rounded-2xl px-6 py-4 text-white focus:outline-none focus:border-white/30"
                  placeholder="Opcional"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black uppercase text-slate-500 mb-2">Precio *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formServicio.precio}
                    onChange={(e) => setFormServicio({ ...formServicio, precio: e.target.value })}
                    className="w-full bg-[#020617] border border-white/10 rounded-2xl px-6 py-4 text-white focus:outline-none focus:border-white/30"
                    placeholder="0.00"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-black uppercase text-slate-500 mb-2">Duración (min) *</label>
                  <input
                    type="number"
                    value={formServicio.duracion}
                    onChange={(e) => setFormServicio({ ...formServicio, duracion: e.target.value })}
                    className="w-full bg-[#020617] border border-white/10 rounded-2xl px-6 py-4 text-white focus:outline-none focus:border-white/30"
                    placeholder="30"
                    required
                  />
                </div>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="ocultar_precio"
                  checked={formServicio.ocultar_precio}
                  onChange={(e) => setFormServicio({ ...formServicio, ocultar_precio: e.target.checked })}
                  className="w-5 h-5 rounded"
                />
                <label htmlFor="ocultar_precio" className="text-sm text-slate-300">
                  Ocultar precio en la agenda pública
                </label>
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setModalNuevoServicio(false)
                    setFormServicio({ nombre: '', descripcion: '', precio: '', duracion: '', ocultar_precio: false })
                  }}
                  className="flex-1 px-6 py-4 rounded-2xl bg-white/5 text-slate-400 font-bold uppercase text-sm hover:bg-white/10"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-6 py-4 rounded-2xl font-black uppercase text-sm hover:scale-105 transition-transform"
                  style={{ backgroundColor: colorPrimario, color: '#000' }}
                >
                  Crear {labelServicio}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: NUEVO STAFF */}
      {modalNuevoStaff && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-[#0f172a] border border-white/10 rounded-[3rem] p-10 max-w-2xl w-full">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-3xl font-black text-white italic uppercase">Nuevo {labelStaff}</h3>
              <button 
                onClick={() => {
                  setModalNuevoStaff(false)
                  setFormStaff({ nombre: '', especialidad: '', horario_inicio: '09:00', horario_fin: '18:00', dias_trabajo: ['L', 'Ma', 'Mi', 'J', 'V'] })
                }}
                className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-slate-400 hover:bg-white/10"
              >
                ✕
              </button>
            </div>
            
            <form onSubmit={handleCrearStaff} className="space-y-6">
              <div>
                <label className="block text-xs font-black uppercase text-slate-500 mb-2">Nombre *</label>
                <input
                  type="text"
                  value={formStaff.nombre}
                  onChange={(e) => setFormStaff({ ...formStaff, nombre: e.target.value })}
                  className="w-full bg-[#020617] border border-white/10 rounded-2xl px-6 py-4 text-white focus:outline-none focus:border-white/30"
                  placeholder="Nombre completo"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-black uppercase text-slate-500 mb-2">Especialidad</label>
                <input
                  type="text"
                  value={formStaff.especialidad}
                  onChange={(e) => setFormStaff({ ...formStaff, especialidad: e.target.value })}
                  className="w-full bg-[#020617] border border-white/10 rounded-2xl px-6 py-4 text-white focus:outline-none focus:border-white/30"
                  placeholder="Ej: Barber Senior"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black uppercase text-slate-500 mb-2">Hora Inicio</label>
                  <input
                    type="time"
                    value={formStaff.horario_inicio}
                    onChange={(e) => setFormStaff({ ...formStaff, horario_inicio: e.target.value })}
                    className="w-full bg-[#020617] border border-white/10 rounded-2xl px-6 py-4 text-white focus:outline-none focus:border-white/30"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black uppercase text-slate-500 mb-2">Hora Fin</label>
                  <input
                    type="time"
                    value={formStaff.horario_fin}
                    onChange={(e) => setFormStaff({ ...formStaff, horario_fin: e.target.value })}
                    className="w-full bg-[#020617] border border-white/10 rounded-2xl px-6 py-4 text-white focus:outline-none focus:border-white/30"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-black uppercase text-slate-500 mb-3">Días de Trabajo</label>
                <div className="flex gap-2">
                  {['L', 'Ma', 'Mi', 'J', 'V', 'S', 'D'].map(dia => (
                    <button
                      key={dia}
                      type="button"
                      onClick={() => {
                        const nuevos = formStaff.dias_trabajo.includes(dia)
                          ? formStaff.dias_trabajo.filter(d => d !== dia)
                          : [...formStaff.dias_trabajo, dia]
                        setFormStaff({ ...formStaff, dias_trabajo: nuevos })
                      }}
                      className={`flex-1 py-3 rounded-xl font-bold uppercase text-sm transition-all ${
                        formStaff.dias_trabajo.includes(dia)
                          ? 'text-black'
                          : 'bg-white/5 text-slate-500'
                      }`}
                      style={formStaff.dias_trabajo.includes(dia) ? { backgroundColor: colorPrimario } : {}}
                    >
                      {dia}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setModalNuevoStaff(false)
                    setFormStaff({ nombre: '', especialidad: '', horario_inicio: '09:00', horario_fin: '18:00', dias_trabajo: ['L', 'Ma', 'Mi', 'J', 'V'] })
                  }}
                  className="flex-1 px-6 py-4 rounded-2xl bg-white/5 text-slate-400 font-bold uppercase text-sm hover:bg-white/10"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-6 py-4 rounded-2xl font-black uppercase text-sm hover:scale-105 transition-transform"
                  style={{ backgroundColor: colorPrimario, color: '#000' }}
                >
                  Agregar {labelStaff}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: NUEVO NEGOCIO (Superadmin) */}
      {modalNuevoNegocio && rol === 'superadmin' && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-[#0f172a] border border-white/10 rounded-[3rem] p-10 max-w-2xl w-full">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-3xl font-black text-white italic uppercase">Crear Nuevo Negocio</h3>
              <button 
                onClick={() => {
                  setModalNuevoNegocio(false)
                  setFormNuevoNegocio({ nombre: '', slug: '', vertical: 'barberia', dueno_email: '' })
                }}
                className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-slate-400 hover:bg-white/10"
              >
                ✕
              </button>
            </div>
            
            <form onSubmit={handleCrearNegocio} className="space-y-6">
              <div>
                <label className="block text-xs font-black uppercase text-slate-500 mb-2">Nombre del Negocio *</label>
                <input
                  type="text"
                  value={formNuevoNegocio.nombre}
                  onChange={(e) => setFormNuevoNegocio({ ...formNuevoNegocio, nombre: e.target.value })}
                  className="w-full bg-[#020617] border border-white/10 rounded-2xl px-6 py-4 text-white focus:outline-none focus:border-white/30"
                  placeholder="Ej: Barbería El Corte Fino"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-black uppercase text-slate-500 mb-2">Slug (URL) *</label>
                <input
                  type="text"
                  value={formNuevoNegocio.slug}
                  onChange={(e) => setFormNuevoNegocio({ ...formNuevoNegocio, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                  className="w-full bg-[#020617] border border-white/10 rounded-2xl px-6 py-4 text-white focus:outline-none focus:border-white/30 font-mono"
                  placeholder="corte-fino"
                  required
                />
                <p className="text-xs text-slate-500 mt-2">
                  URL: tuapp.com/agenda/{formNuevoNegocio.slug || 'slug'}
                </p>
              </div>

              <div>
                <label className="block text-xs font-black uppercase text-slate-500 mb-2">Vertical *</label>
                <select
                  value={formNuevoNegocio.vertical}
                  onChange={(e) => setFormNuevoNegocio({ ...formNuevoNegocio, vertical: e.target.value })}
                  className="w-full bg-[#020617] border border-white/10 rounded-2xl px-6 py-4 text-white focus:outline-none focus:border-white/30"
                  required
                >
                  <option value="barberia">Barbería</option>
                  <option value="peluqueria">Peluquería</option>
                  <option value="estetica">Estética</option>
                  <option value="spa">Spa</option>
                  <option value="consultorio">Consultorio Médico</option>
                  <option value="odontologia">Odontología</option>
                  <option value="otro">Otro</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-black uppercase text-slate-500 mb-2">Email del Dueño *</label>
                <input
                  type="email"
                  value={formNuevoNegocio.dueno_email}
                  onChange={(e) => setFormNuevoNegocio({ ...formNuevoNegocio, dueno_email: e.target.value })}
                  className="w-full bg-[#020617] border border-white/10 rounded-2xl px-6 py-4 text-white focus:outline-none focus:border-white/30"
                  placeholder="dueno@ejemplo.com"
                  required
                />
                <p className="text-xs text-slate-500 mt-2">
                  ⚠️ Este usuario debe estar registrado en la plataforma
                </p>
              </div>

              <div className="bg-blue-500/10 border border-blue-500/30 rounded-2xl p-4">
                <p className="text-blue-300 text-sm">
                  ℹ️ El negocio se creará con 14 días de trial gratuito
                </p>
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setModalNuevoNegocio(false)
                    setFormNuevoNegocio({ nombre: '', slug: '', vertical: 'barberia', dueno_email: '' })
                  }}
                  className="flex-1 px-6 py-4 rounded-2xl bg-white/5 text-slate-400 font-bold uppercase text-sm hover:bg-white/10"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-6 py-4 rounded-2xl font-black uppercase text-sm hover:scale-105 transition-transform"
                  style={{ backgroundColor: colorPrimario, color: '#000' }}
                >
                  Crear Negocio
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ACCIONES DE TURNO */}
      {modalAccionesTurno && turnoSeleccionado && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-[#0f172a] border border-white/10 rounded-[3rem] p-10 max-w-2xl w-full">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-3xl font-black text-white italic uppercase">Gestionar Turno</h3>
              <button onClick={() => { setModalAccionesTurno(false); setTurnoSeleccionado(null); setConfirmacionEliminar(false) }}
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