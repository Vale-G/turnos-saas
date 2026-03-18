export const THEME_COLORS: Record<string, string> = {
  emerald: '#10b981',
  rose: '#f43f5e',
  blue: '#3b82f6',
  amber: '#f59e0b',
}

export const getThemeColor = (theme?: string): string => {
  if (!theme) return THEME_COLORS.emerald
  return THEME_COLORS[theme] ?? THEME_COLORS.emerald
}
