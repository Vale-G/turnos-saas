export const TIMEZONE_AR = 'America/Argentina/Buenos_Aires'

export const LIMITES_PLAN = {
  normal: { maxStaff: 2,   maxServicios: 5   },
  basico: { maxStaff: 2,   maxServicios: 5   },
  pro:    { maxStaff: 999, maxServicios: 999  },
  trial:  { maxStaff: 999, maxServicios: 999  },
} as const

export const ESTADOS_TURNO = ['pendiente', 'confirmado', 'completado', 'cancelado'] as const
export const TIPOS_PAGO = ['efectivo', 'mercadopago', 'transferencia', 'otro'] as const
