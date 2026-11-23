export type BusinessType = 'general' | 'salud' | 'belleza' | 'cabello' | 'unas' | 'bienestar' | 'profesional'
export type VisualStyle = 'sereno' | 'minimal' | 'editorial' | 'audaz'
export type VisualMode = 'oscuro' | 'claro'
export type Personalization = { businessType?: string | null; visualStyle?: string | null; visualMode?: string | null }
export const BUSINESS_TYPES: ReadonlyArray<{ id: BusinessType; name: string; description: string }>
export const VISUAL_STYLES: ReadonlyArray<{ id: VisualStyle; name: string; radius: string; tracking: string }>
export const VISUAL_MODES: ReadonlyArray<{ id: VisualMode; name: string }>
export function isBusinessType(value: unknown): value is BusinessType
export function isVisualStyle(value: unknown): value is VisualStyle
export function isVisualMode(value: unknown): value is VisualMode
export function normalizePersonalization(input?: Personalization): { businessType: BusinessType; visualStyle: VisualStyle; visualMode: VisualMode }
export function getAppearance(input?: Personalization): {
  businessType: BusinessType; visualStyle: VisualStyle; visualMode: VisualMode
  radius: string; tracking: string; background: string; foreground: string
  muted: string; surface: string; border: string
}
