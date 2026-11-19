export function parsearListaNegra(valor: unknown): { ok: boolean; telefonos: string[] }
export function telefonoBloqueado(telefonos: string[], telefono: string): boolean
export function verificarListaNegra(consultar: () => PromiseLike<{ data: { valor?: string | null } | null; error: unknown }>, telefono: string): Promise<{ permitido: boolean; motivo: 'consulta' | 'configuracion' | 'telefono' | 'bloqueado' | null }>
export function validarListaNegraServidor(data: { valor?: unknown } | null, telefono: string): { permitido: boolean; motivo: 'configuracion' | 'telefono' | 'bloqueado' | null }
export function consultarListaNegraServidor(consultar: () => PromiseLike<{ data: { valor?: unknown } | null; error: unknown }>, telefono: string): Promise<{ permitido: boolean; motivo: 'consulta' | 'configuracion' | 'telefono' | 'bloqueado' | null }>
