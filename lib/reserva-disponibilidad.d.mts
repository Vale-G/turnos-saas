export type BloqueoHorario = {
  hora_inicio: string
  hora_fin: string
}

export type OpcionesHorarios = {
  apertura: string
  cierre: string
  duracion: number
  ocupados?: string[]
  bloqueos?: BloqueoHorario[]
  minLimite?: number
}

export function generarHorariosDisponibles(opciones: OpcionesHorarios): string[]
