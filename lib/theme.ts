export const TEMAS: Record<string, { color: string; nombre: string }> = {
  emerald: { color: '#10b981', nombre: 'Esmeralda' },
  rose:    { color: '#f43f5e', nombre: 'Rosa' },
  blue:    { color: '#3b82f6', nombre: 'Azul' },
  amber:   { color: '#f59e0b', nombre: 'Ámbar' },
  violet:  { color: '#8b5cf6', nombre: 'Violeta' },
  cyan:    { color: '#06b6d4', nombre: 'Cian' },
}

export function getThemeColor(tema?: string | null): string {
  return TEMAS[tema ?? 'emerald']?.color ?? TEMAS.emerald.color
}
