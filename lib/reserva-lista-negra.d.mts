export function parsearListaNegra(valor: unknown): { ok: boolean; telefonos: string[] }
export function telefonoBloqueado(telefonos: string[], telefono: string): boolean
export function verificarListaNegra(consultar: () => Promise<{ data: { valor?: string | null } | null; error: unknown }>, telefono: string): Promise<{ permitido: boolean; motivo: 'consulta' | 'configuracion' | 'telefono' | 'bloqueado' | null }>
