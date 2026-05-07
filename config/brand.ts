export type ThemeMode = 'light-only' | 'dark-only' | 'with-toggle'

const envThemeMode = process.env.NEXT_PUBLIC_THEME_MODE

export const brandConfig = {
  appName: process.env.NEXT_PUBLIC_APP_NAME || 'Turnos',
  appLogoUrl: process.env.NEXT_PUBLIC_APP_LOGO_URL || '/fvtech-logo.jpg',
  brandColor: process.env.NEXT_PUBLIC_BRAND_COLOR || '#020617',
  themeMode: (envThemeMode === 'with-toggle'
    ? 'with-toggle'
    : envThemeMode === 'dark-only'
      ? 'dark-only'
      : 'light-only') as ThemeMode,
}
