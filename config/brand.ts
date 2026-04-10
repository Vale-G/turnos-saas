export type ThemeMode = 'light-only' | 'with-toggle'

const envThemeMode = process.env.NEXT_PUBLIC_THEME_MODE
const envAppName = process.env.NEXT_PUBLIC_APP_NAME || 'Turnly'
const envLogoUrl = process.env.NEXT_PUBLIC_APP_LOGO_URL || '/fvtech-logo.jpg'
const envBrandColor = process.env.NEXT_PUBLIC_BRAND_COLOR

const isBookIt = envAppName.toLowerCase().includes('bookit')
const defaultBrandColor = isBookIt ? '#0f172a' : '#7c3aed'
const fallbackLogoUrl = isBookIt ? '/bookit-logo.svg' : '/turnly-logo.svg'
const resolvedLogoUrl = envLogoUrl === '/fvtech-logo.jpg' ? fallbackLogoUrl : envLogoUrl

export const brandConfig = {
  appName: envAppName,
  appLogoUrl: resolvedLogoUrl,
  brandColor: envBrandColor || defaultBrandColor,
  themeMode: (envThemeMode === 'with-toggle' ? 'with-toggle' : 'light-only') as ThemeMode,
}
