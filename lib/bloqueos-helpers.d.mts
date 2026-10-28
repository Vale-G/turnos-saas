export type StaffRelation = { nombre: string } | { nombre: string }[] | null | undefined

export function getStaffNombre(staff: StaffRelation): string | undefined
export function esRangoHorarioValido(inicio: string, fin: string): boolean
