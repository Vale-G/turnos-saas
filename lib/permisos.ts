// lib/permisos.ts
// ============================================
// SISTEMA DE PERMISOS (RBAC)
// ============================================

import { RolUsuario, PlanNegocio } from '@/types/database.types'

export type Accion = 
  | 'create' 
  | 'read' 
  | 'update' 
  | 'delete' 
  | 'read_own' 
  | 'update_own' 
  | 'cancel_own'

export type Seccion = 
  | 'negocios'
  | 'agenda' 
  | 'servicios' 
  | 'staff' 
  | 'clientes' 
  | 'finanzas' 
  | 'configuracion'
  | 'analytics'

// ============================================
// MATRIZ DE PERMISOS POR ROL
// ============================================

type MatrizPermisos = {
  [key in Seccion]: {
    [key in RolUsuario]?: Accion[]
  }
}

export const PERMISOS: MatrizPermisos = {
  negocios: {
    superadmin: ['create', 'read', 'update', 'delete'],
    owner: ['read'],
    staff: [],
    cliente: []
  },
  
  agenda: {
    superadmin: ['create', 'read', 'update', 'delete'],
    owner: ['create', 'read', 'update', 'delete'],
    staff: ['read_own', 'update_own'],
    cliente: ['read_own', 'cancel_own']
  },
  
  servicios: {
    superadmin: ['create', 'read', 'update', 'delete'],
    owner: ['create', 'read', 'update', 'delete'],
    staff: ['read'],
    cliente: ['read']
  },
  
  staff: {
    superadmin: ['create', 'read', 'update', 'delete'],
    owner: ['create', 'read', 'update', 'delete'],
    staff: ['read'],
    cliente: []
  },
  
  clientes: {
    superadmin: ['read'],
    owner: ['read'],
    staff: [],
    cliente: []
  },
  
  finanzas: {
    superadmin: ['read'],
    owner: ['read', 'create', 'update', 'delete'],
    staff: [],
    cliente: []
  },
  
  configuracion: {
    superadmin: ['read', 'update'],
    owner: ['read', 'update'],
    staff: [],
    cliente: []
  },
  
  analytics: {
    superadmin: ['read'],
    owner: [],
    staff: [],
    cliente: []
  }
}

// ============================================
// HOOK: usePuede
// ============================================

/**
 * Hook para verificar permisos
 * @example
 * const puedeCrearTurno = usePuede('agenda', 'create')
 */
export const usePuede = (rol: RolUsuario, seccion: Seccion, accion: Accion): boolean => {
  const permisosRol = PERMISOS[seccion]?.[rol] || []
  return permisosRol.includes(accion)
}

/**
 * Función helper para verificar múltiples permisos
 */
export const tieneAlgunPermiso = (
  rol: RolUsuario, 
  seccion: Seccion, 
  acciones: Accion[]
): boolean => {
  return acciones.some(accion => usePuede(rol, seccion, accion))
}

/**
 * Función helper para verificar todos los permisos
 */
export const tieneTodosPermisos = (
  rol: RolUsuario, 
  seccion: Seccion, 
  acciones: Accion[]
): boolean => {
  return acciones.every(accion => usePuede(rol, seccion, accion))
}

// ============================================
// CONTROL DE ACCESO POR PLAN
// ============================================

type FeaturesPlanes = {
  [key in PlanNegocio]: {
    nombre: string
    precio: number
    features: string[]
    secciones_disponibles: Seccion[]
    limites: {
      turnos_mes: number | 'ilimitado'
      staff_max: number | 'ilimitado'
      servicios_max: number | 'ilimitado'
      almacenamiento_mb: number
    }
  }
}

export const PLANES: FeaturesPlanes = {
  trial: {
    nombre: 'Prueba Gratis',
    precio: 0,
    features: [
      'Agenda básica',
      'Hasta 3 profesionales',
      'Hasta 50 turnos/mes',
      'Soporte por email'
    ],
    secciones_disponibles: ['agenda', 'servicios', 'staff', 'configuracion'],
    limites: {
      turnos_mes: 50,
      staff_max: 3,
      servicios_max: 10,
      almacenamiento_mb: 50
    }
  },
  
  basico: {
    nombre: 'Plan Básico',
    precio: 25000,
    features: [
      'Agenda ilimitada',
      'Profesionales ilimitados',
      'Reservas online públicas',
      'Recordatorios por WhatsApp',
      'Soporte prioritario'
    ],
    secciones_disponibles: ['agenda', 'servicios', 'staff', 'configuracion'],
    limites: {
      turnos_mes: 'ilimitado',
      staff_max: 'ilimitado',
      servicios_max: 'ilimitado',
      almacenamiento_mb: 500
    }
  },
  
  pro: {
    nombre: 'Plan Pro',
    precio: 45000,
    features: [
      'Todo lo del Plan Básico',
      'CRM avanzado de clientes',
      'Reportes financieros detallados',
      'Gestión de gastos',
      'Dashboard de Business Intelligence',
      'Exportar reportes a PDF/Excel',
      'Sin marca de agua',
      'Soporte 24/7'
    ],
    secciones_disponibles: ['agenda', 'servicios', 'staff', 'clientes', 'finanzas', 'configuracion'],
    limites: {
      turnos_mes: 'ilimitado',
      staff_max: 'ilimitado',
      servicios_max: 'ilimitado',
      almacenamiento_mb: 2000
    }
  }
}

// ============================================
// HOOK: usePlanFeatures
// ============================================

/**
 * Hook para verificar features del plan
 * @example
 * const { canAccessCRM, canAccessFinanzas, limits } = usePlanFeatures(negocio.plan)
 */
export const usePlanFeatures = (plan: string) => {
  // Definimos qué tiene cada plan por si la base de datos falla
  const planes: any = {
    trial: { secciones_disponibles: ['agenda', 'servicios', 'staff'], servicios_ilimitados: false },
    basico: { secciones_disponibles: ['agenda', 'servicios', 'staff'], servicios_ilimitados: false },
    pro: { secciones_disponibles: ['agenda', 'servicios', 'staff', 'clientes', 'finanzas'], servicios_ilimitados: true }
  };

  // Si el plan no existe en nuestra lista, usamos 'trial' por defecto
  const planData = planes[plan] || planes['trial'];

  return {
    // Ahora es seguro porque planData nunca va a ser undefined
    canAccessCRM: planData.secciones_disponibles.includes('clientes'),
    canAccessFinanzas: planData.secciones_disponibles.includes('finanzas'),
    canAccessAnalytics: planData.secciones_disponibles.includes('analytics'),
    serviciosIlimitados: planData.servicios_ilimitados
  };
};

// ============================================
// VALIDACIONES DE NEGOCIO
// ============================================

/**
 * Valida si un negocio puede realizar una acción según su plan
 */
export const validarLimitePlan = (
  plan: PlanNegocio,
  tipo: 'turnos_mes' | 'staff_max' | 'servicios_max',
  cantidadActual: number
): { permitido: boolean; mensaje?: string } => {
  const limite = PLANES[plan].limites[tipo]
  
  if (limite === 'ilimitado') {
    return { permitido: true }
  }
  
  if (cantidadActual >= limite) {
    return {
      permitido: false,
      mensaje: `Has alcanzado el límite de ${limite} ${tipo.replace('_', ' ')} de tu plan ${PLANES[plan].nombre}`
    }
  }
  
  return { permitido: true }
}

/**
 * Calcula días restantes del trial
 */
export const calcularDiasRestantesTrial = (trialEndsAt: string): number => {
  const hoy = new Date()
  const fin = new Date(trialEndsAt)
  const diferencia = fin.getTime() - hoy.getTime()
  return Math.ceil(diferencia / (1000 * 60 * 60 * 24))
}

/**
 * Verifica si el trial expiró
 */
export const trialExpirado = (plan: PlanNegocio, trialEndsAt?: string): boolean => {
  if (plan !== 'trial' || !trialEndsAt) return false
  return new Date(trialEndsAt) < new Date()
}
