export type ThemeId = 'emerald' | 'rose' | 'blue' | 'amber' | 'violet' | 'cyan'

export type ThemeConfig = {
  id: ThemeId
  nombre: string
  color: string
}

export const DEFAULT_THEME_ID: ThemeId = 'emerald'

export const TEMAS: Record<ThemeId, ThemeConfig> = {
  emerald: { id: 'emerald', color: '#10b981', nombre: 'Esmeralda' },
  rose: { id: 'rose', color: '#f43f5e', nombre: 'Rosa' },
  blue: { id: 'blue', color: '#3b82f6', nombre: 'Azul' },
  amber: { id: 'amber', color: '#f59e0b', nombre: 'Ámbar' },
  violet: { id: 'violet', color: '#8b5cf6', nombre: 'Violeta' },
  cyan: { id: 'cyan', color: '#06b6d4', nombre: 'Cian' },
}

export const TEMAS_LISTA: ThemeConfig[] = Object.values(TEMAS)

export function isThemeId(value?: string | null): value is ThemeId {
  if (!value) return false
  return value in TEMAS
}

export function getTheme(tema?: string | null): ThemeConfig {
  if (isThemeId(tema)) {
    return TEMAS[tema]
  }
  return TEMAS[DEFAULT_THEME_ID]
}

export function getThemeColor(tema?: string | null): string {
  return getTheme(tema).color
}
