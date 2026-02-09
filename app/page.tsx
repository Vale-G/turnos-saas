// ============================================================================
// ARCHIVO: app/(owner)/dashboard/page.tsx
// DESCRIPCIÓN: Dashboard principal del sistema de gestión de turnos
// Este componente maneja TODA la lógica del panel de control incluyendo:
// - Gestión de turnos (CRUD completo)
// - Administración de servicios
// - Manejo de staff/empleados
// - CRM de clientes
// - Dashboard financiero con ingresos/egresos
// - Sistema de permisos por rol (owner/staff) y por plan (trial/basico/pro)
// ============================================================================

'use client' // Directiva de Next.js 13+ que indica que este es un Client Component
// Necesario porque usamos hooks de React (useState, useEffect) y eventos del navegador

// ============================================================================
// IMPORTACIONES
// ============================================================================

import { useState, useEffect } from 'react' // Hooks fundamentales de React
// - useState: Para manejar estado local del componente
// - useEffect: Para ejecutar efectos secundarios (cargar datos al montar)

import { supabase } from '@/lib/supabase' // Cliente de Supabase configurado
// Este import trae la instancia ya inicializada con las credenciales del proyecto

import { 
  Negocio,      // Tipo: datos del negocio (nombre, plan, colores, labels)
  Servicio,     // Tipo: servicios ofrecidos (corte, manicura, consulta, etc.)
  Staff,        // Tipo: empleados/profesionales del negocio
  Turno,        // Tipo: reservas/citas agendadas
  Egreso,       // Tipo: gastos del negocio (alquiler, luz, productos)
  RolUsuario,   // Tipo: 'owner' | 'staff' (define permisos)
  FormTurno,    // Tipo: estructura del formulario para crear turnos
  FormServicio, // Tipo: estructura del formulario para crear servicios
  FormStaff,    // Tipo: estructura del formulario para agregar staff
  FormEgreso,   // Tipo: estructura del formulario para registrar gastos
  Message       // Tipo: notificaciones flash (texto + tipo: success/error/warning)
} from '@/types/database.types'

import { usePuede, usePlanFeatures, calcularDiasRestantesTrial } from '@/lib/permisos'
// - usePuede: Hook que verifica si un rol puede hacer una acción (ej: staff no puede crear servicios)
// - usePlanFeatures: Hook que retorna las features disponibles según el plan (trial/basico/pro)
// - calcularDiasRestantesTrial: Función que calcula días restantes del trial

import CalendarioSemanal from '@/components/dashboard/CalendarioSemanal'
// Componente visual que muestra la grilla semanal de turnos por staff/día/hora

import UpgradePlanModal from '@/components/dashboard/UpgradePlanModal'
// Modal que se abre cuando el usuario intenta acceder a features premium

// ============================================================================
// DEFINICIÓN DE TIPOS LOCALES
// ============================================================================

// Define las 6 secciones posibles del dashboard
// Este tipo asegura que TypeScript nos avise si escribimos mal un nombre de sección
type SeccionActiva = 'agenda' | 'servicios' | 'staff' | 'clientes' | 'finanzas' | 'configuracion'

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

export default function DashboardOwner() {
  
  // ==========================================================================
  // ESTADO DEL NEGOCIO Y USUARIO
  // ==========================================================================
  
  // Estado que almacena TODOS los datos del negocio actual
  // Incluye: id, nombre, plan (trial/basico/pro), color_primario, labels personalizados
  // Inicia en null porque aún no cargamos los datos de Supabase
  const [negocio, setNegocio] = useState<Negocio | null>(null)
  
  // Estado que define el rol del usuario actual: 'owner' o 'staff'
  // MEJORA: Ahora es un estado modificable para facilitar testing
  // En producción, este valor vendría de la sesión autenticada de Supabase
  const [rol, setRol] = useState<RolUsuario>('owner')
  
  // Estado que controla qué sección del dashboard está visible
  // Por defecto arranca en 'agenda' que es la pantalla más usada
  const [seccionActiva, setSeccionActiva] = useState<SeccionActiva>('agenda')
  
  // Estado booleano que indica si estamos cargando datos de la BD
  // Mientras sea true, mostramos un spinner de carga
  const [loading, setLoading] = useState(true)

  // ==========================================================================
  // ESTADO DE DATOS (Listas cargadas desde Supabase)
  // ==========================================================================
  
  // Array de todos los servicios del negocio (ej: "Corte de Pelo $500 - 30min")
  const [servicios, setServicios] = useState<Servicio[]>([])
  
  // Array de todos los empleados/profesionales del negocio
  const [staff, setStaff] = useState<Staff[]>([])
  
  // Array de todos los turnos/citas agendadas
  // Incluye relaciones con Servicio y Staff mediante JOIN de Supabase
  const [turnos, setTurnos] = useState<Turno[]>([])
  
  // Array de todos los egresos/gastos registrados
  const [egresos, setEgresos] = useState<Egreso[]>([])

  // ==========================================================================
  // ESTADO DE FORMULARIOS
  // ==========================================================================
  
  // Estado del formulario para crear un nuevo turno
  // Cada campo tiene valores iniciales vacíos
  const [formTurno, setFormTurno] = useState<FormTurno>({
    cliente: '',      // Nombre del cliente (requerido)
    telefono: '',     // Teléfono de contacto (opcional)
    email: '',        // Email de contacto (opcional)
    servicio: '',     // ID del servicio seleccionado (requerido)
    staff: '',        // ID del staff seleccionado (requerido)
    fecha: '',        // Fecha y hora en formato ISO (requerido)
    notas: ''         // Notas internas visibles solo para el negocio (opcional)
  })
  
  // Estado del formulario para crear un nuevo servicio
  const [formServicio, setFormServicio] = useState<FormServicio>({
    nombre: '',           // Ej: "Corte de Pelo"
    descripcion: '',      // Descripción detallada (opcional)
    precio: '',           // Precio en string para facilitar input (se parsea a float)
    duracion: '',         // Duración en minutos (se parsea a int)
    ocultar_precio: false // Si true, no se muestra precio en booking público
  })
  
  // Estado del formulario para agregar un nuevo miembro del staff
  const [formStaff, setFormStaff] = useState<FormStaff>({
    nombre: '',                                  // Nombre completo del empleado
    especialidad: '',                            // Ej: "Barbería", "Coloración"
    horario_inicio: '09:00',                     // Hora de inicio de jornada
    horario_fin: '18:00',                        // Hora de fin de jornada
    dias_trabajo: ['L', 'Ma', 'Mi', 'J', 'V']   // Array de días laborales
  })
  
  // Estado del formulario para registrar un nuevo egreso/gasto
  const [formEgreso, setFormEgreso] = useState<FormEgreso>({
    categoria: 'otro',                                      // Categoría del gasto
    descripcion: '',                                        // Descripción detallada
    monto: '',                                              // Monto en string (se parsea a float)
    fecha: new Date().toISOString().split('T')[0]          // Fecha actual en formato YYYY-MM-DD
  })

  // ==========================================================================
  // ESTADO DE UI/UX
  // ==========================================================================
  
  // Fecha seleccionada para filtrar turnos (formato YYYY-MM-DD)
  // Se usa en la vista de agenda y en los cálculos financieros
  const [filtroFecha, setFiltroFecha] = useState(new Date().toISOString().split('T')[0])
  
  // Estado de mensajes flash/notificaciones temporales
  // Se muestra en el sidebar durante 4 segundos después de una acción
  const [mensaje, setMensaje] = useState<Message>({ texto: '', tipo: 'info' })
  
  // Estado que controla la apertura del modal de upgrade de plan
  // 'feature' indica qué funcionalidad bloqueada intentó acceder el usuario
  const [modalUpgrade, setModalUpgrade] = useState<{ abierto: boolean; feature: string }>({ 
    abierto: false, 
    feature: '' 
  })
  
  // Estado que controla la apertura del modal de detalle de turno
  // 'turno' contiene el turno completo cuando se hace click en el calendario
  const [modalTurno, setModalTurno] = useState<{ abierto: boolean; turno: Turno | null }>({ 
    abierto: false, 
    turno: null 
  })

  // ==========================================================================
  // EFECTO INICIAL: Carga de datos al montar el componente
  // ==========================================================================
  
  useEffect(() => {
    // Este efecto se ejecuta UNA SOLA VEZ cuando el componente se monta
    // El array vacío [] como segundo argumento asegura que no se re-ejecute
    cargarDatos()
  }, []) // Array de dependencias vacío = solo al montar

  // ==========================================================================
  // FUNCIÓN: Cargar todos los datos desde Supabase
  // ==========================================================================
  
  const cargarDatos = async () => {
    // Activamos el estado de carga para mostrar el spinner
    setLoading(true)
    
    try {
      // -----------------------------------------------------------------------
      // PASO 1: Obtener datos del negocio
      // -----------------------------------------------------------------------
      // TODO: En producción, esto debe filtrar por el negocio_id del usuario autenticado
      // Por ahora simulamos obteniendo el primer negocio de la tabla
      const { data: negocioData, error: negocioError } = await supabase
        .from('Negocio')           // Nombre de la tabla en Supabase (EXACTO del original)
        .select('*')                // Seleccionar todas las columnas
        .limit(1)                   // Limitar a 1 resultado
        .single()                   // Retornar objeto directo en vez de array

      // Si hubo error al cargar el negocio, logueamos y salimos
      if (negocioError) {
        console.error('Error cargando negocio:', negocioError)
        setLoading(false)
        return
      }

      // Si encontramos un negocio, procedemos a cargar sus datos relacionados
      if (negocioData) {
        // Guardamos el negocio en el estado para usarlo en toda la app
        setNegocio(negocioData)

        // ---------------------------------------------------------------------
        // PASO 2: Cargar TODOS los datos relacionados en PARALELO
        // ---------------------------------------------------------------------
        // Promise.all ejecuta múltiples promesas simultáneamente
        // Esto es MUY importante para performance: en vez de hacer 4 requests
        // secuenciales (que tomarían ~2 segundos), hacemos 4 requests paralelos
        // (que toman ~500ms total)
        const [serviciosRes, staffRes, turnosRes, egresosRes] = await Promise.all([
          // Query 1: Obtener todos los servicios de este negocio
          supabase
            .from('Servicio')      // Tabla "Servicio" (EXACTO del original)
            .select('*')
            .eq('negocio_id', negocioData.id), // Filtrar por negocio_id
          
          // Query 2: Obtener todo el staff de este negocio
          supabase
            .from('Staff')         // Tabla "Staff" (EXACTO del original)
            .select('*')
            .eq('negocio_id', negocioData.id),
          
          // Query 3: Obtener todos los turnos CON sus relaciones (JOIN)
          // El asterisco después de Servicio y Staff trae TODOS los campos
          supabase
            .from('turnos')                    // Tabla "turnos" en minúsculas (EXACTO del original)
            .select('*, Servicio(*), Staff(*)') // JOIN con Servicio y Staff (con mayúsculas como en el original)
            .eq('negocio_id', negocioData.id),
          
          // Query 4: Obtener todos los egresos de este negocio
          supabase
            .from('Egresos')       // Tabla "Egresos" (EXACTO del original)
            .select('*')
            .eq('negocio_id', negocioData.id)
        ])

        // ---------------------------------------------------------------------
        // PASO 3: Validar errores de cada query
        // ---------------------------------------------------------------------
        // Es importante validar cada respuesta individualmente porque una puede
        // fallar mientras las otras tienen éxito
        if (serviciosRes.error) console.error('Error servicios:', serviciosRes.error)
        if (staffRes.error) console.error('Error staff:', staffRes.error)
        if (turnosRes.error) console.error('Error turnos:', turnosRes.error)
        if (egresosRes.error) console.error('Error egresos:', egresosRes.error)

        // ---------------------------------------------------------------------
        // PASO 4: Guardar datos en el estado
        // ---------------------------------------------------------------------
        // Usamos el operador || para proporcionar un array vacío si data es null
        // MEJORA: Agregamos optional chaining (?.) para evitar crashes
        setServicios(serviciosRes.data || [])
        setStaff(staffRes.data || [])
        setTurnos(turnosRes.data || [])
        setEgresos(egresosRes.data || [])
      }
    } catch (error) {
      // Capturamos cualquier error inesperado (problemas de red, etc.)
      console.error('Error en cargarDatos:', error)
    } finally {
      // El bloque finally SIEMPRE se ejecuta, haya error o no
      // Agregamos un pequeño delay de 500ms para evitar flash de carga
      // (mejora la UX cuando la carga es muy rápida)
      setTimeout(() => setLoading(false), 500)
    }
  }

  // ==========================================================================
  // FUNCIÓN: Mostrar notificación temporal
  // ==========================================================================
  
  const notify = (texto: string, tipo: Message['tipo']) => {
    // Actualizamos el estado del mensaje
    setMensaje({ texto, tipo })
    
    // Después de 4 segundos (4000ms), limpiamos el mensaje
    // Esto hace que la notificación desaparezca automáticamente
    setTimeout(() => setMensaje({ texto: '', tipo: 'info' }), 4000)
  }

  // ==========================================================================
  // FUNCIÓN: Verificar acceso a features premium
  // ==========================================================================
  
  const verificarAccesoFeature = (seccion: SeccionActiva): boolean => {
    // Si no hay negocio cargado, negamos acceso por seguridad
    if (!negocio) return false
    
    // Obtenemos las features disponibles según el plan actual del negocio
    // MEJORA: Agregamos validación para evitar que features sea undefined
    const features = usePlanFeatures(negocio.plan || 'trial')
    
    // Validamos que features tenga las propiedades esperadas
    if (!features) {
      console.error('Features es undefined para el plan:', negocio.plan)
      return false
    }
    
    // Si intenta acceder a CRM y su plan no lo permite...
    if (seccion === 'clientes' && !features.canAccessCRM) {
      // Abrimos el modal de upgrade indicando qué feature está bloqueada
      setModalUpgrade({ abierto: true, feature: 'CRM de Clientes' })
      return false // Negamos acceso
    }
    
    // Si intenta acceder a Finanzas y su plan no lo permite...
    if (seccion === 'finanzas' && !features.canAccessFinanzas) {
      setModalUpgrade({ abierto: true, feature: 'Reportes Financieros' })
      return false
    }
    
    // Si llegamos aquí, el usuario tiene acceso a la feature
    return true
  }

  // ==========================================================================
  // FUNCIÓN: Cambiar de sección con validación de permisos
  // ==========================================================================
  
  const cambiarSeccion = (seccion: SeccionActiva) => {
    // Primero verificamos si tiene acceso a la feature
    // Solo si retorna true, cambiamos la sección activa
    if (verificarAccesoFeature(seccion)) {
      setSeccionActiva(seccion)
    }
  }

  // ==========================================================================
  // HANDLER: Crear nuevo turno
  // ==========================================================================
  
  const handleCrearTurno = async (e: React.FormEvent) => {
    // Prevenimos el comportamiento default del form (recargar página)
    e.preventDefault()
    
    // Validación de seguridad: no permitir crear turnos sin negocio cargado
    if (!negocio) return

    // -----------------------------------------------------------------------
    // VALIDACIÓN 1: Cliente es requerido
    // -----------------------------------------------------------------------
    // .trim() elimina espacios en blanco al inicio y final
    // Si después de trim() está vacío, mostramos error
    if (!formTurno.cliente.trim()) {
      return notify('⚠️ El nombre del cliente es requerido', 'error')
    }

    // -----------------------------------------------------------------------
    // CONVERSIÓN: Fecha de input local a ISO 8601
    // -----------------------------------------------------------------------
    // El input datetime-local retorna algo como "2024-02-09T14:30"
    // Necesitamos convertirlo a ISO completo: "2024-02-09T14:30:00.000Z"
    const isoFecha = new Date(formTurno.fecha).toISOString()
    
    // -----------------------------------------------------------------------
    // VALIDACIÓN 2: Verificar conflictos de horario
    // -----------------------------------------------------------------------
    // Buscamos si ya existe un turno para el mismo staff en la misma hora
    // Solo consideramos turnos que NO estén finalizados ni cancelados
    const conflicto = turnos.find(t => 
      t.staff_id === formTurno.staff &&           // Mismo staff
      t.hora_inicio === isoFecha &&                // Misma hora
      t.estado !== 'finalizado' &&                 // No finalizado
      t.estado !== 'cancelado'                     // No cancelado
    )

    // Si encontramos un conflicto, mostramos error y salimos
    if (conflicto) {
      return notify('⚠️ El profesional ya tiene un turno a esa hora', 'error')
    }

    // -----------------------------------------------------------------------
    // INSERCIÓN: Crear el turno en Supabase
    // -----------------------------------------------------------------------
    const { error } = await supabase.from('turnos').insert([{  // Tabla "turnos" en minúsculas (EXACTO)
      negocio_id: negocio.id,                     // FK al negocio
      nombre_cliente: formTurno.cliente,          // Nombre del cliente
      telefono_cliente: formTurno.telefono || null, // Teléfono (nullable)
      email_cliente: formTurno.email || null,     // Email (nullable)
      servicio_id: formTurno.servicio,            // FK al servicio
      staff_id: formTurno.staff,                  // FK al staff
      hora_inicio: isoFecha,                      // Fecha/hora en ISO
      estado: 'pendiente',                        // Estado inicial
      notas_internas: formTurno.notas || null     // Notas (nullable)
    }])

    // Si hubo error en la inserción, mostramos mensaje y salimos
    if (error) {
      notify(`❌ Error: ${error.message}`, 'error')
      return
    }

    // -----------------------------------------------------------------------
    // ÉXITO: Limpiar formulario y recargar datos
    // -----------------------------------------------------------------------
    // Reseteamos todos los campos del formulario a sus valores iniciales
    setFormTurno({ 
      cliente: '', 
      telefono: '', 
      email: '', 
      servicio: '', 
      staff: '', 
      fecha: '', 
      notas: '' 
    })
    
    // Mostramos notificación de éxito
    notify('🚀 Turno agendado con éxito', 'success')
    
    // Recargamos todos los datos para ver el nuevo turno en la lista
    cargarDatos()
  }

  // ==========================================================================
  // HANDLER: Crear nuevo servicio
  // ==========================================================================
  
  const handleCrearServicio = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!negocio) return

    // -----------------------------------------------------------------------
    // CONVERSIÓN Y VALIDACIÓN: Precio
    // -----------------------------------------------------------------------
    // parseFloat convierte el string a número decimal
    // Ej: "150.50" -> 150.5
    const precio = parseFloat(formServicio.precio)

    // isNaN verifica si NO es un número (ej: usuario escribió texto)
    // También validamos que sea mayor a 0
    if (isNaN(precio) || precio <= 0) {
      return notify('⚠️ El precio debe ser mayor a 0', 'error')
    }

    // -----------------------------------------------------------------------
    // CONVERSIÓN Y VALIDACIÓN: Duración
    // -----------------------------------------------------------------------
    // parseInt convierte el string a número entero
    // Ej: "30" -> 30
    const duracion = parseInt(formServicio.duracion)

    if (isNaN(duracion) || duracion <= 0) {
      return notify('⚠️ La duración debe ser mayor a 0', 'error')
    }

    // -----------------------------------------------------------------------
    // INSERCIÓN: Crear el servicio en Supabase
    // -----------------------------------------------------------------------
    const { error } = await supabase.from('Servicio').insert([{  // Tabla "Servicio" (EXACTO)
      negocio_id: negocio.id,
      nombre: formServicio.nombre,
      descripcion: formServicio.descripcion || null, // Nullable
      precio,                                         // Ya parseado a float
      duracion_minutos: duracion,                    // Ya parseado a int
      ocultar_precio: formServicio.ocultar_precio    // Boolean directo
    }])

    if (error) {
      notify(`❌ Error: ${error.message}`, 'error')
      return
    }

    // -----------------------------------------------------------------------
    // ÉXITO: Limpiar formulario y recargar
    // -----------------------------------------------------------------------
    setFormServicio({ 
      nombre: '', 
      descripcion: '', 
      precio: '', 
      duracion: '', 
      ocultar_precio: false 
    })
    notify('✅ Servicio creado', 'success')
    cargarDatos()
  }

  // ==========================================================================
  // HANDLER: Crear nuevo staff
  // ==========================================================================
  
  const handleCrearStaff = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!negocio) return

    // -----------------------------------------------------------------------
    // INSERCIÓN: Agregar staff a Supabase
    // -----------------------------------------------------------------------
    const { error } = await supabase.from('Staff').insert([{  // Tabla "Staff" (EXACTO)
      negocio_id: negocio.id,
      nombre: formStaff.nombre,
      especialidad: formStaff.especialidad || null,  // Nullable
      horario_inicio: formStaff.horario_inicio,      // Formato "HH:MM"
      horario_fin: formStaff.horario_fin,            // Formato "HH:MM"
      dias_trabajo: formStaff.dias_trabajo           // Array de strings
    }])

    if (error) {
      notify(`❌ Error: ${error.message}`, 'error')
      return
    }

    // -----------------------------------------------------------------------
    // ÉXITO: Resetear formulario y recargar
    // -----------------------------------------------------------------------
    setFormStaff({ 
      nombre: '', 
      especialidad: '', 
      horario_inicio: '09:00', 
      horario_fin: '18:00', 
      dias_trabajo: ['L', 'Ma', 'Mi', 'J', 'V'] 
    })
    notify('👤 Staff vinculado', 'success')
    cargarDatos()
  }

  // ==========================================================================
  // HANDLER: Registrar nuevo egreso/gasto
  // ==========================================================================
  
  const handleCrearEgreso = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!negocio) return

    // -----------------------------------------------------------------------
    // CONVERSIÓN Y VALIDACIÓN: Monto
    // -----------------------------------------------------------------------
    const monto = parseFloat(formEgreso.monto)
    if (isNaN(monto) || monto <= 0) {
      return notify('⚠️ El monto debe ser mayor a 0', 'error')
    }

    // -----------------------------------------------------------------------
    // INSERCIÓN: Registrar egreso en Supabase
    // -----------------------------------------------------------------------
    const { error } = await supabase.from('Egresos').insert([{  // Tabla "Egresos" (EXACTO)
      negocio_id: negocio.id,
      categoria: formEgreso.categoria,     // Ej: "alquiler", "luz", "productos"
      descripcion: formEgreso.descripcion,
      monto,                                // Ya parseado a float
      fecha: formEgreso.fecha               // Formato YYYY-MM-DD
    }])

    if (error) {
      notify(`❌ Error: ${error.message}`, 'error')
      return
    }

    // -----------------------------------------------------------------------
    // ÉXITO: Resetear formulario con fecha de hoy y recargar
    // -----------------------------------------------------------------------
    setFormEgreso({ 
      categoria: 'otro', 
      descripcion: '', 
      monto: '', 
      fecha: new Date().toISOString().split('T')[0] // Resetear a hoy
    })
    notify('💰 Gasto registrado', 'success')
    cargarDatos()
  }

  // ==========================================================================
  // HANDLER: Upgrade de plan (integración futura con Mercado Pago)
  // ==========================================================================
  
  const handleUpgrade = async (nuevoPlan: 'basico' | 'pro') => {
    if (!negocio) return
    
    // TODO: Aquí iría la integración con Mercado Pago
    // 1. Crear preferencia de pago
    // 2. Redirigir a checkout
    // 3. Webhook para confirmar pago
    // 4. Actualizar plan en Supabase
    alert(`Redirigiendo a pago de ${nuevoPlan}...`)
    setModalUpgrade({ abierto: false, feature: '' })
  }

  // ==========================================================================
  // PANTALLA DE CARGA
  // ==========================================================================
  // Si estamos cargando datos O no hay negocio, mostramos spinner
  // Esto evita intentar renderizar el dashboard con datos null/undefined
  
  if (loading || !negocio) {
    return (
      <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center gap-6">
        {/* Spinner animado con borde en gradiente */}
        <div className="w-20 h-20 border-4 border-[#10b981]/10 border-t-[#10b981] rounded-full animate-spin" />
        
        {/* Texto de carga con animación de pulso */}
        <h2 className="text-[#10b981] font-black text-2xl uppercase tracking-[0.4em] animate-pulse">
          Cargando Plataforma
        </h2>
      </div>
    )
  }

  // ==========================================================================
  // VARIABLES DERIVADAS (calculadas a partir del estado)
  // ==========================================================================
  // Estas variables se recalculan en cada render basándose en el estado actual
  
  // Color primario del negocio con fallback
  // Si no está definido en la BD, usamos verde por defecto
  const colorPrimario = negocio.color_primario || '#10b981'
  
  // Plan actual del negocio con fallback a trial
  const planActual = negocio.plan || 'trial'
  
  // Obtenemos las features disponibles para este plan
  // MEJORA: Agregamos validación robusta
  const features = usePlanFeatures(planActual) || {
    canAccessCRM: false,
    canAccessFinanzas: false,
    maxStaff: 1,
    maxServicios: 5
  }

  // -----------------------------------------------------------------------
  // CÁLCULO: Días restantes de trial
  // -----------------------------------------------------------------------
  // Solo calculamos si el plan es trial Y existe fecha de fin
  const diasTrial = (negocio.plan === 'trial' && negocio.trial_ends_at) 
    ? Math.max(0, Math.floor(
        (new Date(negocio.trial_ends_at).getTime() - new Date().getTime()) 
        / (1000 * 3600 * 24) // Convertir milisegundos a días
      ))
    : 0

  // -----------------------------------------------------------------------
  // FILTRADO: Turnos del día seleccionado
  // -----------------------------------------------------------------------
  // Filtramos los turnos cuya fecha coincida con filtroFecha
  // .includes() es más flexible que === porque acepta timestamps parciales
  const turnosHoy = turnos.filter(t => t.hora_inicio?.includes(filtroFecha))
  
  // -----------------------------------------------------------------------
  // CÁLCULO FINANCIERO 1: Ingresos brutos del día
  // -----------------------------------------------------------------------
  // Sumamos el precio de todos los turnos finalizados
  // MEJORA: Usamos optional chaining (?.) para evitar crash si Servicio es null
  const ingresosBrutos = turnosHoy
    .filter(t => t.estado === 'finalizado')           // Solo finalizados
    .reduce((sum, t) => sum + (t.Servicio?.precio || 0), 0) // Suma con fallback
  
  // -----------------------------------------------------------------------
  // CÁLCULO FINANCIERO 2: Egresos del día
  // -----------------------------------------------------------------------
  const egresosHoy = egresos
    .filter(e => e.fecha === filtroFecha)              // Solo del día seleccionado
    .reduce((sum, e) => sum + e.monto, 0)              // Suma de montos
  
  // -----------------------------------------------------------------------
  // CÁLCULO FINANCIERO 3: Ganancia neta
  // -----------------------------------------------------------------------
  // Ingresos - Egresos = Ganancia
  const gananciaNeta = ingresosBrutos - egresosHoy

  // ==========================================================================
  // FUNCIÓN: Obtener top clientes (para sección CRM)
  // ==========================================================================
  
  const getTopClientes = () => {
    // Usamos un Map para agrupar turnos por cliente
    // Map es mejor que Object para este caso porque preserva orden de inserción
    const mapa = new Map<string, { visitas: number; total: number }>()
    
    // Iteramos todos los turnos para acumular visitas y total gastado
    turnos.forEach(t => {
      // Obtenemos el registro actual del cliente (o creamos uno nuevo)
      const actual = mapa.get(t.nombre_cliente) || { visitas: 0, total: 0 }
      
      // Incrementamos visitas siempre
      actual.visitas += 1
      
      // Solo sumamos al total si el turno está finalizado (cobrado)
      // MEJORA: Optional chaining para evitar crash
      if (t.estado === 'finalizado') {
        actual.total += t.Servicio?.precio || 0
      }
      
      // Guardamos el registro actualizado
      mapa.set(t.nombre_cliente, actual)
    })
    
    // Convertimos el Map a array, ordenamos por total gastado y tomamos top 6
    return Array.from(mapa.entries())
      .sort((a, b) => b[1].total - a[1].total)  // Orden descendente por total
      .slice(0, 6)                               // Top 6
  }

  // ==========================================================================
  // RENDERIZADO DEL COMPONENTE
  // ==========================================================================
  
  return (
    <div className="min-h-screen bg-[#020617] text-slate-300 flex font-sans">
      
      {/* ====================================================================
          SIDEBAR - Navegación y controles
          ==================================================================== */}
      <aside className="w-80 border-r border-white/5 bg-[#020617] flex flex-col p-10 gap-10 sticky top-0 h-screen overflow-y-auto">
        
        {/* ------------------------------------------------------------------
            Logo y nombre del negocio
            ------------------------------------------------------------------ */}
        <div className="flex items-center gap-4">
          {/* Avatar con inicial del negocio */}
          <div 
            className="w-12 h-12 rounded-2xl flex items-center justify-center text-black font-black text-3xl shadow-[0_0_30px_rgba(16,185,129,0.3)]"
            style={{ 
              background: `linear-gradient(to bottom right, ${colorPrimario}, ${colorPrimario}dd)` 
            }}
          >
            {/* .charAt(0) obtiene la primera letra del nombre */}
            {negocio.nombre.charAt(0)}
          </div>
          
          {/* Información del negocio */}
          <div>
            <h1 className="font-black italic text-white text-xl tracking-tighter uppercase leading-none">
              {negocio.nombre}
            </h1>
            <p className="text-[10px] text-slate-600 font-bold uppercase tracking-wider mt-1">
              {/* Vertical: Peluquería, Barbería, Spa, etc. */}
              {negocio.vertical}
            </p>
          </div>
        </div>

        {/* ------------------------------------------------------------------
            MEJORA: Selector de Rol para testing
            ------------------------------------------------------------------ */}
        <div className="bg-[#0f172a] border border-white/5 p-4 rounded-2xl">
          <p className="text-[10px] font-black uppercase text-slate-500 mb-2">
            Rol Actual (Testing)
          </p>
          <div className="flex gap-2">
            {/* Botón Owner */}
            <button
              onClick={() => setRol('owner')}
              className={`flex-1 py-2 px-3 rounded-xl text-[10px] font-black uppercase transition-all ${
                rol === 'owner'
                  ? 'text-black shadow-lg'
                  : 'bg-white/5 text-slate-500 hover:bg-white/10'
              }`}
              style={rol === 'owner' ? { backgroundColor: colorPrimario } : {}}
            >
              👑 Owner
            </button>
            
            {/* Botón Staff */}
            <button
              onClick={() => setRol('staff')}
              className={`flex-1 py-2 px-3 rounded-xl text-[10px] font-black uppercase transition-all ${
                rol === 'staff'
                  ? 'text-black shadow-lg'
                  : 'bg-white/5 text-slate-500 hover:bg-white/10'
              }`}
              style={rol === 'staff' ? { backgroundColor: colorPrimario } : {}}
            >
              👤 Staff
            </button>
          </div>
        </div>

        {/* ------------------------------------------------------------------
            Warning de trial próximo a vencer
            ------------------------------------------------------------------ */}
        {/* Solo mostramos si está en trial Y quedan 3 días o menos */}
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

        {/* ------------------------------------------------------------------
            Menú de navegación principal
            ------------------------------------------------------------------ */}
        <nav className="flex flex-col gap-2 flex-1">
          {/* Mapeamos cada item del menú */}
          {[
            { 
              id: 'agenda', 
              label: 'Agenda', 
              icon: '🗓️' 
            },
            { 
              id: 'servicios', 
              // Usamos el label personalizado del negocio (ej: "Tratamientos" en vez de "Servicios")
              label: negocio.label_servicio + 's', 
              icon: '✂️' 
            },
            { 
              id: 'staff', 
              // Usamos el label personalizado (ej: "Doctores" en vez de "Staff")
              label: negocio.label_staff + 's', 
              icon: '👥' 
            },
            { 
              id: 'clientes', 
              label: 'CRM', 
              icon: '💎', 
              // Marcamos como premium si el plan no permite CRM
              premium: !features.canAccessCRM 
            },
            { 
              id: 'finanzas', 
              label: 'Finanzas', 
              icon: '💰', 
              // Marcamos como premium si el plan no permite Finanzas
              premium: !features.canAccessFinanzas 
            },
            { 
              id: 'configuracion', 
              label: 'Config', 
              icon: '⚙️' 
            },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => cambiarSeccion(item.id as SeccionActiva)}
              className={`flex items-center gap-4 p-5 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest transition-all relative ${
                seccionActiva === item.id 
                  ? `text-black shadow-xl` 
                  : 'hover:bg-white/5 text-slate-500'
              }`}
              // Si está activo, aplicamos el color primario del negocio
              style={seccionActiva === item.id ? { backgroundColor: colorPrimario } : {}}
            >
              {/* Icono del item */}
              <span className="text-xl">{item.icon}</span>
              
              {/* Label del item */}
              {item.label}
              
              {/* Candado si es feature premium */}
              {item.premium && (
                <span className="ml-auto text-yellow-500 text-lg">🔒</span>
              )}
            </button>
          ))}
        </nav>

        {/* ------------------------------------------------------------------
            Sistema de notificaciones flash
            ------------------------------------------------------------------ */}
        {/* Solo renderizamos si hay un mensaje activo */}
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
          MAIN CONTENT - Contenido principal según sección activa
          ==================================================================== */}
      <main className="flex-1 p-12 overflow-y-auto">
        
        {/* ==================================================================
            SECCIÓN: AGENDA
            ================================================================== */}
        {seccionActiva === 'agenda' && (
          <div className="space-y-12">
            
            {/* Header de la sección */}
            <div className="flex items-center justify-between">
              <h2 className="text-5xl font-black text-white italic uppercase tracking-tighter">
                Agenda <span style={{ color: colorPrimario }}>Semanal</span>
              </h2>
              
              {/* Control de fecha */}
              <div className="flex items-center gap-4">
                <input
                  type="date"
                  value={filtroFecha}
                  onChange={(e) => setFiltroFecha(e.target.value)}
                  className="bg-[#0f172a] border border-white/5 px-6 py-3 rounded-2xl text-white text-sm outline-none"
                />
              </div>
            </div>

            {/* Componente de calendario semanal */}
            {/* Este componente renderiza una grilla: Staff x Horarios x Días */}
            <CalendarioSemanal
              turnos={turnos}
              staff={staff.filter(s => s.activo)} // Solo mostramos staff activo
              onTurnoClick={(turno) => setModalTurno({ abierto: true, turno })}
              onSlotClick={(fecha, staffId) => {
                // Cuando hacen click en un slot vacío, pre-llenamos el formulario
                const fechaStr = fecha.toISOString().slice(0, 16) // "2024-02-09T14:30"
                setFormTurno({ ...formTurno, fecha: fechaStr, staff: staffId })
              }}
              colorPrimario={colorPrimario}
            />

            {/* Formulario para crear nuevo turno */}
            <div className="bg-[#0f172a] p-10 rounded-[3rem] border border-white/5">
              <h3 className="text-2xl font-black text-white italic uppercase mb-6">
                Nuevo Turno
              </h3>
              
              {/* Grid 2 columnas responsive */}
              <form onSubmit={handleCrearTurno} className="grid grid-cols-2 gap-4">
                {/* Campo: Nombre del cliente */}
                <input
                  type="text"
                  placeholder="Nombre del cliente"
                  value={formTurno.cliente}
                  onChange={(e) => setFormTurno({ ...formTurno, cliente: e.target.value })}
                  className="bg-[#020617] border border-white/5 p-5 rounded-2xl text-white text-sm outline-none"
                  required
                />
                
                {/* Campo: Teléfono */}
                <input
                  type="tel"
                  placeholder="Teléfono"
                  value={formTurno.telefono}
                  onChange={(e) => setFormTurno({ ...formTurno, telefono: e.target.value })}
                  className="bg-[#020617] border border-white/5 p-5 rounded-2xl text-white text-sm outline-none"
                />
                
                {/* Campo: Servicio (select) */}
                <select
                  value={formTurno.servicio}
                  onChange={(e) => setFormTurno({ ...formTurno, servicio: e.target.value })}
                  className="bg-[#020617] border border-white/5 p-5 rounded-2xl text-white text-sm outline-none"
                  required
                >
                  <option value="">Seleccionar servicio</option>
                  {/* Mapeamos los servicios disponibles */}
                  {/* MEJORA: Optional chaining en el map */}
                  {servicios?.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.nombre} - ${s.precio}
                    </option>
                  ))}
                </select>
                
                {/* Campo: Staff (select) */}
                <select
                  value={formTurno.staff}
                  onChange={(e) => setFormTurno({ ...formTurno, staff: e.target.value })}
                  className="bg-[#020617] border border-white/5 p-5 rounded-2xl text-white text-sm outline-none"
                  required
                >
                  <option value="">Seleccionar profesional</option>
                  {/* Solo mostramos staff activo */}
                  {/* MEJORA: Optional chaining */}
                  {staff?.filter(s => s.activo).map(s => (
                    <option key={s.id} value={s.id}>
                      {s.nombre}
                    </option>
                  ))}
                </select>
                
                {/* Campo: Fecha y hora */}
                <input
                  type="datetime-local"
                  value={formTurno.fecha}
                  onChange={(e) => setFormTurno({ ...formTurno, fecha: e.target.value })}
                  className="bg-[#020617] border border-white/5 p-5 rounded-2xl text-white text-sm outline-none"
                  required
                />
                
                {/* Botón submit */}
                <button 
                  type="submit" 
                  className="col-span-2 text-black font-black py-5 rounded-2xl uppercase text-sm tracking-widest shadow-xl hover:scale-105 transition-transform"
                  style={{ backgroundColor: colorPrimario }}
                >
                  Agendar Turno
                </button>
              </form>
            </div>

            {/* Tarjeta de resumen financiero del día */}
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
                {/* Contamos solo los turnos finalizados */}
                {turnosHoy.filter(t => t.estado === 'finalizado').length} turnos finalizados
              </p>
            </div>
          </div>
        )}

        {/* ==================================================================
            SECCIÓN: SERVICIOS
            ================================================================== */}
        {seccionActiva === 'servicios' && (
          <div className="space-y-12">
            {/* Header */}
            <h2 className="text-5xl font-black text-white italic uppercase tracking-tighter">
              Catálogo de <span style={{ color: colorPrimario }}>{negocio.label_servicio}s</span>
            </h2>
            
            {/* Grid de servicios existentes */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* MEJORA: Optional chaining en el map */}
              {servicios?.map(s => (
                <div key={s.id} className="bg-[#0f172a] p-12 rounded-[4rem] border border-white/5">
                  {/* Nombre del servicio */}
                  <p className="text-white font-black uppercase italic text-3xl tracking-tighter">
                    {s.nombre}
                  </p>
                  
                  {/* Descripción (opcional) */}
                  {s.descripcion && (
                    <p className="text-slate-400 text-sm mt-2">
                      {s.descripcion}
                    </p>
                  )}
                  
                  {/* Precio y duración */}
                  <div className="flex items-baseline gap-2 mt-6">
                    <p className="text-5xl font-black italic" style={{ color: colorPrimario }}>
                      ${s.precio}
                    </p>
                    <span className="text-slate-600 text-sm">
                      • {s.duracion_minutos}min
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Formulario para crear servicio (solo si tiene permisos) */}
            {usePuede(rol, 'servicios', 'create') && (
              <div className="bg-[#020617] border border-white/5 p-10 rounded-[3.5rem]">
                <h4 className="text-white font-black uppercase italic mb-8">
                  Nuevo Servicio
                </h4>
                
                <form onSubmit={handleCrearServicio} className="grid grid-cols-2 gap-4">
                  {/* Campo: Nombre */}
                  <input 
                    type="text" 
                    placeholder="Nombre" 
                    value={formServicio.nombre} 
                    onChange={e => setFormServicio({ ...formServicio, nombre: e.target.value })} 
                    className="bg-[#0f172a] border border-white/5 p-5 rounded-2xl text-white text-sm" 
                    required 
                  />
                  
                  {/* Campo: Descripción */}
                  <input 
                    type="text" 
                    placeholder="Descripción" 
                    value={formServicio.descripcion} 
                    onChange={e => setFormServicio({ ...formServicio, descripcion: e.target.value })} 
                    className="bg-[#0f172a] border border-white/5 p-5 rounded-2xl text-white text-sm" 
                  />
                  
                  {/* Campo: Precio */}
                  <input 
                    type="number" 
                    placeholder="Precio" 
                    value={formServicio.precio} 
                    onChange={e => setFormServicio({ ...formServicio, precio: e.target.value })} 
                    className="bg-[#0f172a] border border-white/5 p-5 rounded-2xl text-white text-sm" 
                    required 
                  />
                  
                  {/* Campo: Duración */}
                  <input 
                    type="number" 
                    placeholder="Duración (min)" 
                    value={formServicio.duracion} 
                    onChange={e => setFormServicio({ ...formServicio, duracion: e.target.value })} 
                    className="bg-[#0f172a] border border-white/5 p-5 rounded-2xl text-white text-sm" 
                    required 
                  />
                  
                  {/* Checkbox: Ocultar precio */}
                  <label className="flex items-center gap-3 col-span-2 text-sm text-slate-400">
                    <input 
                      type="checkbox" 
                      checked={formServicio.ocultar_precio} 
                      onChange={e => setFormServicio({ ...formServicio, ocultar_precio: e.target.checked })} 
                      className="w-5 h-5" 
                    />
                    Ocultar precio en reservas públicas
                  </label>
                  
                  {/* Botón submit */}
                  <button 
                    type="submit" 
                    className="col-span-2 text-black font-black py-5 rounded-2xl uppercase text-sm" 
                    style={{ backgroundColor: colorPrimario }}
                  >
                    Crear Servicio
                  </button>
                </form>
              </div>
            )}
          </div>
        )}

        {/* ==================================================================
            SECCIÓN: STAFF
            ================================================================== */}
        {seccionActiva === 'staff' && (
          <div className="space-y-12">
            {/* Header */}
            <h2 className="text-5xl font-black text-white italic uppercase tracking-tighter">
              Equipo de <span style={{ color: colorPrimario }}>{negocio.label_staff}s</span>
            </h2>
            
            {/* Grid de staff existente */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
              {/* MEJORA: Optional chaining */}
              {staff?.map(s => (
                <div key={s.id} className="bg-[#0f172a] p-12 rounded-[4rem] border border-white/5 text-center">
                  {/* Avatar circular */}
                  <div 
                    className="w-24 h-24 rounded-full flex items-center justify-center text-4xl mx-auto mb-8" 
                    style={{ backgroundColor: `${colorPrimario}20` }}
                  >
                    👤
                  </div>
                  
                  {/* Nombre */}
                  <p className="text-white font-black uppercase italic text-2xl tracking-tighter">
                    {s.nombre}
                  </p>
                  
                  {/* Especialidad (opcional) */}
                  {s.especialidad && (
                    <p className="text-slate-400 text-xs mt-2">
                      {s.especialidad}
                    </p>
                  )}
                  
                  {/* Badge de estado */}
                  <p 
                    className="text-[10px] font-black uppercase mt-4 tracking-widest" 
                    style={{ color: s.activo ? colorPrimario : '#ef4444' }}
                  >
                    {s.activo ? 'Activo' : 'Inactivo'}
                  </p>
                </div>
              ))}
            </div>

            {/* Formulario para agregar staff (solo si tiene permisos) */}
            {usePuede(rol, 'staff', 'create') && (
              <div className="bg-[#020617] border border-white/5 p-10 rounded-[3.5rem]">
                <h4 className="text-white font-black uppercase italic mb-8">
                  Nuevo Miembro
                </h4>
                
                <form onSubmit={handleCrearStaff} className="grid grid-cols-2 gap-4">
                  {/* Campo: Nombre */}
                  <input 
                    type="text" 
                    placeholder="Nombre completo" 
                    value={formStaff.nombre} 
                    onChange={e => setFormStaff({ ...formStaff, nombre: e.target.value })} 
                    className="bg-[#0f172a] border border-white/5 p-5 rounded-2xl text-white text-sm" 
                    required 
                  />
                  
                  {/* Campo: Especialidad */}
                  <input 
                    type="text" 
                    placeholder="Especialidad" 
                    value={formStaff.especialidad} 
                    onChange={e => setFormStaff({ ...formStaff, especialidad: e.target.value })} 
                    className="bg-[#0f172a] border border-white/5 p-5 rounded-2xl text-white text-sm" 
                  />
                  
                  {/* Botón submit */}
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

        {/* ==================================================================
            SECCIÓN: CLIENTES (CRM)
            ================================================================== */}
        {seccionActiva === 'clientes' && (
          <div className="space-y-12">
            {/* Header */}
            <h2 className="text-5xl font-black text-white italic uppercase tracking-tighter">
              Top <span style={{ color: colorPrimario }}>Clientes</span>
            </h2>
            
            {/* Grid de top clientes */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Mapeamos el resultado de getTopClientes() */}
              {/* MEJORA: Optional chaining */}
              {getTopClientes()?.map(([nombre, datos]) => (
                <div key={nombre} className="bg-[#0f172a] p-10 rounded-[4rem] border border-white/5">
                  {/* Avatar */}
                  <div 
                    className="w-16 h-16 rounded-full flex items-center justify-center text-3xl mb-8" 
                    style={{ backgroundColor: `${colorPrimario}20` }}
                  >
                    👤
                  </div>
                  
                  {/* Nombre del cliente */}
                  <p className="text-3xl font-black text-white uppercase italic tracking-tighter">
                    {nombre}
                  </p>
                  
                  {/* Métricas: Visitas y Total gastado */}
                  <div className="grid grid-cols-2 gap-6 mt-10 pt-8 border-t border-white/5">
                    {/* Visitas */}
                    <div>
                      <p className="text-[10px] text-slate-500 uppercase">Visitas</p>
                      <p className="text-2xl font-black italic" style={{ color: colorPrimario }}>
                        {datos.visitas}
                      </p>
                    </div>
                    
                    {/* Total gastado */}
                    <div>
                      <p className="text-[10px] text-slate-500 uppercase">Total</p>
                      <p className="text-2xl font-black text-white italic">
                        ${datos.total}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ==================================================================
            SECCIÓN: FINANZAS
            ================================================================== */}
        {seccionActiva === 'finanzas' && (
          <div className="space-y-12">
            {/* Header */}
            <h2 className="text-5xl font-black text-white italic uppercase tracking-tighter">
              Dashboard <span style={{ color: colorPrimario }}>Financiero</span>
            </h2>
            
            {/* Grid de métricas financieras */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Tarjeta: Ingresos Brutos */}
              <div className="bg-[#0f172a] p-12 rounded-[4rem] border border-white/5">
                <p className="text-[10px] font-black text-slate-500 uppercase">
                  Ingresos Brutos
                </p>
                <p className="text-6xl font-black text-white italic mt-4">
                  ${ingresosBrutos}
                </p>
              </div>
              
              {/* Tarjeta: Egresos */}
              <div className="bg-[#0f172a] p-12 rounded-[4rem] border border-white/5">
                <p className="text-[10px] font-black text-slate-500 uppercase">
                  Egresos
                </p>
                <p className="text-6xl font-black text-red-400 italic mt-4">
                  ${egresosHoy}
                </p>
              </div>
              
              {/* Tarjeta: Ganancia Neta (destacada) */}
              <div className="p-12 rounded-[4rem]" style={{ backgroundColor: colorPrimario }}>
                <p className="text-[10px] font-black uppercase opacity-60">
                  Ganancia Neta
                </p>
                <p className="text-6xl font-black text-[#020617] italic mt-4">
                  ${gananciaNeta}
                </p>
              </div>
            </div>

            {/* Formulario para registrar gasto */}
            <div className="bg-[#020617] border border-white/5 p-10 rounded-[3.5rem]">
              <h4 className="text-white font-black uppercase italic mb-8">
                Registrar Gasto
              </h4>
              
              <form onSubmit={handleCrearEgreso} className="grid grid-cols-2 gap-4">
                {/* Campo: Categoría (select) */}
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
                
                {/* Campo: Descripción */}
                <input 
                  type="text" 
                  placeholder="Descripción" 
                  value={formEgreso.descripcion} 
                  onChange={e => setFormEgreso({ ...formEgreso, descripcion: e.target.value })} 
                  className="bg-[#0f172a] border border-white/5 p-5 rounded-2xl text-white text-sm" 
                  required 
                />
                
                {/* Campo: Monto */}
                <input 
                  type="number" 
                  placeholder="Monto" 
                  value={formEgreso.monto} 
                  onChange={e => setFormEgreso({ ...formEgreso, monto: e.target.value })} 
                  className="bg-[#0f172a] border border-white/5 p-5 rounded-2xl text-white text-sm" 
                  required 
                />
                
                {/* Campo: Fecha */}
                <input 
                  type="date" 
                  value={formEgreso.fecha} 
                  onChange={e => setFormEgreso({ ...formEgreso, fecha: e.target.value })} 
                  className="bg-[#0f172a] border border-white/5 p-5 rounded-2xl text-white text-sm" 
                  required 
                />
                
                {/* Botón submit */}
                <button 
                  type="submit" 
                  className="col-span-2 text-black font-black py-5 rounded-2xl uppercase text-sm" 
                  style={{ backgroundColor: colorPrimario }}
                >
                  Registrar Gasto
                </button>
              </form>
            </div>
          </div>
        )}

      </main>

      {/* ====================================================================
          MODAL: Upgrade de Plan
          ==================================================================== */}
      {/* Solo se renderiza si modalUpgrade.abierto es true */}
      {/* MEJORA: Validación robusta para evitar crash */}
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