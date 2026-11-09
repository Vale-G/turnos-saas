export type BloqueoHorario = {
  hora_inicio: string
  hora_fin: string
}

export type TurnoOcupado = {
  hora: string
  duracion: number
}

export type OpcionesHorarios = {
  apertura: string
  cierre: string
  duracion: number
  ocupados?: TurnoOcupado[]
  bloqueos?: BloqueoHorario[]
  minLimite?: number
}

export function generarHorariosDisponibles(opciones: OpcionesHorarios): string[]
