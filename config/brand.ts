export type ThemeMode = 'light-only' | 'with-toggle'

const envThemeMode = process.env.NEXT_PUBLIC_THEME_MODE

export const brandConfig = {
  appName: process.env.NEXT_PUBLIC_APP_NAME || 'Turnly',
  appLogoUrl: process.env.NEXT_PUBLIC_APP_LOGO_URL || '/fvtech-logo.jpg',
  brandColor: process.env.NEXT_PUBLIC_BRAND_COLOR || '#f43f5e',
  themeMode: (envThemeMode === 'with-toggle' ? 'with-toggle' : 'light-only') as ThemeMode,
}
