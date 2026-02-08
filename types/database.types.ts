// types/database.types.ts
// ============================================
// TIPOS BASE DE LA BASE DE DATOS
// ============================================

export type VerticalNegocio = 'peluqueria' | 'spa' | 'consultorio' | 'gym' | 'taller' | 'otro'
export type PlanNegocio = 'trial' | 'basico' | 'pro'
export type SubscriptionStatus = 'active' | 'past_due' | 'canceled'
export type RolUsuario = 'superadmin' | 'owner' | 'staff' | 'cliente'
export type EstadoTurno = 'pendiente' | 'confirmado' | 'finalizado' | 'cancelado'
export type CategoriaEgreso = 'alquiler' | 'luz' | 'agua' | 'productos' | 'sueldos' | 'impuestos' | 'otro'
export type DiaSemana = 'L' | 'Ma' | 'Mi' | 'J' | 'V' | 'S' | 'D'

// ============================================
// INTERFACES PRINCIPALES
// ============================================

export interface Negocio {
  id: string
  nombre: string
  slug: string
  owner_id: string
  
  // Configuración
  vertical: VerticalNegocio
  logo_url?: string
  color_primario: string
  
  // Textos personalizables
  label_servicio: string
  label_staff: string
  label_cliente: string
  
  // Plan y pagos
  plan: PlanNegocio
  trial_ends_at?: string
  subscription_status: SubscriptionStatus
  
  // Metadata
  created_at: string
  updated_at: string
  last_activity_at: string
  
  // Relaciones (opcional, cuando se hace JOIN)
  Servicio?: Servicio[]
  Staff?: Staff[]
  turnos?: Turno[]
  Egresos?: Egreso[]
}

export interface UsuarioNegocio {
  id: string
  user_id: string
  negocio_id: string
  rol: RolUsuario
  activo: boolean
  created_at: string
}

export interface Servicio {
  id: string
  negocio_id: string
  nombre: string
  descripcion?: string
  precio: number
  duracion_minutos: number
  activo: boolean
  ocultar_precio: boolean
  created_at: string
}

export interface Staff {
  id: string
  negocio_id: string
  user_id?: string
  nombre: string
  avatar_url?: string
  especialidad?: string
  activo: boolean
  
  // Horarios
  horario_inicio: string // "09:00"
  horario_fin: string    // "18:00"
  dias_trabajo: DiaSemana[]
  
  created_at: string
}

export interface Turno {
  id: string
  negocio_id: string
  servicio_id: string
  staff_id: string
  
  // Cliente
  nombre_cliente: string
  telefono_cliente?: string
  email_cliente?: string
  cliente_id?: string
  
  // Fecha y hora
  hora_inicio: string // ISO timestamp
  hora_fin?: string
  
  // Estado
  estado: EstadoTurno
  
  // Notas
  notas_internas?: string
  
  // Metadata
  created_at: string
  cancelado_at?: string
  cancelado_por?: string
  
  // Relaciones (cuando se hace JOIN)
  Servicio?: Servicio
  Staff?: Staff
}

export interface Egreso {
  id: string
  negocio_id: string
  categoria: CategoriaEgreso
  descripcion: string
  monto: number
  fecha: string // "2024-02-08"
  created_by: string
  created_at: string
}

export interface PagoSubscripcion {
  id: string
  negocio_id: string
  plan: PlanNegocio
  monto: number
  estado: 'pending' | 'approved' | 'rejected'
  
  // Mercado Pago
  mp_payment_id?: string
  mp_preference_id?: string
  
  periodo_inicio: string
  periodo_fin: string
  created_at: string
}

// ============================================
// TIPOS PARA FORMULARIOS
// ============================================

export interface FormTurno {
  cliente: string
  telefono: string
  email: string
  servicio: string // ID del servicio
  staff: string    // ID del staff
  fecha: string    // datetime-local format
  notas: string
}

export interface FormServicio {
  nombre: string
  descripcion: string
  precio: string  // string porque viene del input
  duracion: string
  ocultar_precio: boolean
}

export interface FormStaff {
  nombre: string
  especialidad: string
  horario_inicio: string
  horario_fin: string
  dias_trabajo: DiaSemana[]
}

export interface FormNegocio {
  nombre: string
  vertical: VerticalNegocio
  email_owner: string
}

export interface FormEgreso {
  categoria: CategoriaEgreso
  descripcion: string
  monto: string
  fecha: string
}

// ============================================
// TIPOS PARA UI/ESTADO
// ============================================

export interface Message {
  texto: string
  tipo: 'success' | 'error' | 'info' | 'warning'
}

export interface TopCliente {
  nombre: string
  visitas: number
  total_gastado: number
}

export interface DatosFinancieros {
  ingresos_brutos: number
  egresos_totales: number
  ganancia_neta: number
  turnos_finalizados: number
  ticket_promedio: number
  ocupacion_porcentaje: number
}

export interface HorarioDisponible {
  fecha: string
  hora: string
  disponible: boolean
  staff_id: string
}

// ============================================
// TIPOS PARA CONFIGURACIÓN
// ============================================

export interface ConfiguracionNegocio {
  logo_url?: string
  color_primario: string
  color_secundario: string
  label_servicio: string
  label_staff: string
  label_cliente: string
  
  // Horarios del negocio
  horario_apertura: string
  horario_cierre: string
  dias_atencion: DiaSemana[]
  
  // Configuración de reservas
  permite_reserva_online: boolean
  requiere_confirmacion: boolean
  tiempo_anticipacion_minimo: number // horas
  tiempo_cancelacion_maximo: number  // horas
}

// ============================================
// TIPOS PARA ANALYTICS (SUPERADMIN)
// ============================================

export interface MetricasSaaS {
  negocios_activos: number
  negocios_trial: number
  mrr: number // Monthly Recurring Revenue
  churn_rate: number
  total_turnos_mes: number
  total_usuarios: number
}

export interface NegocioConMetricas extends Negocio {
  turnos_mes: number
  ingresos_mes: number
  ultima_actividad: string
  dias_sin_actividad: number
}
