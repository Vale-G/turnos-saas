export const BUSINESS_TYPES = [
  { id: 'general', name: 'General', description: 'Una experiencia neutral y flexible.' },
  { id: 'salud', name: 'Salud y consultorios', description: 'Clara, serena y profesional.' },
  { id: 'belleza', name: 'Estética y belleza', description: 'Cálida, visual y cuidada.' },
  { id: 'cabello', name: 'Peluquería y barbería', description: 'Directa, moderna y dinámica.' },
  { id: 'unas', name: 'Manicuría', description: 'Delicada, editorial y cercana.' },
  { id: 'bienestar', name: 'Bienestar', description: 'Calma, espacio y confianza.' },
  { id: 'profesional', name: 'Servicios profesionales', description: 'Sobria, simple y eficiente.' },
]

export const VISUAL_STYLES = [
  { id: 'sereno', name: 'Sereno', radius: '2rem', tracking: '-0.025em' },
  { id: 'minimal', name: 'Minimal', radius: '1rem', tracking: '-0.04em' },
  { id: 'editorial', name: 'Editorial', radius: '0.5rem', tracking: '-0.055em' },
  { id: 'audaz', name: 'Audaz', radius: '2.75rem', tracking: '-0.06em' },
]

export const VISUAL_MODES = [
  { id: 'oscuro', name: 'Oscuro' },
  { id: 'claro', name: 'Claro' },
]

const ids = (items) => new Set(items.map((item) => item.id))
const businessTypeIds = ids(BUSINESS_TYPES)
const visualStyleIds = ids(VISUAL_STYLES)
const visualModeIds = ids(VISUAL_MODES)

export function isBusinessType(value) { return typeof value === 'string' && businessTypeIds.has(value) }
export function isVisualStyle(value) { return typeof value === 'string' && visualStyleIds.has(value) }
export function isVisualMode(value) { return typeof value === 'string' && visualModeIds.has(value) }

export function normalizePersonalization(input = {}) {
  return {
    businessType: isBusinessType(input.businessType) ? input.businessType : 'general',
    visualStyle: isVisualStyle(input.visualStyle) ? input.visualStyle : 'sereno',
    visualMode: isVisualMode(input.visualMode) ? input.visualMode : 'oscuro',
  }
}

export function getAppearance(input = {}) {
  const normalized = normalizePersonalization(input)
  const style = VISUAL_STYLES.find((item) => item.id === normalized.visualStyle)
  const light = normalized.visualMode === 'claro'
  return {
    ...normalized,
    radius: style.radius,
    tracking: style.tracking,
    background: light ? '#f8fafc' : '#020617',
    foreground: light ? '#0f172a' : '#f8fafc',
    muted: light ? '#64748b' : '#94a3b8',
    surface: light ? '#ffffff' : '#0f172a',
    border: light ? 'rgba(15,23,42,.12)' : 'rgba(255,255,255,.10)',
  }
}
