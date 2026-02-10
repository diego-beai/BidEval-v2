/**
 * Proveedores soportados por el sistema de Propuestas
 * Basado en el workflow n8n
 */
export enum Provider {
  TR = 'TECNICASREUNIDAS',
  IDOM = 'IDOM',
  SACYR = 'SACYR',
  EA = 'EA',
  SENER = 'SENER',
  TRESCA = 'TRESCA',
  WORLEY = 'WORLEY'
}

/**
 * Tipos de evaluación soportados
 */
export enum EvaluationType {
  TECHNICAL = 'Technical Evaluation',
  ECONOMICAL = 'Economical Evaluation',
  OTHERS = 'Others'
}

/**
 * Nombres display para proveedores
 */
export const PROVIDER_DISPLAY_NAMES: Record<Provider, string> = {
  [Provider.TR]: 'TR',
  [Provider.IDOM]: 'IDOM',
  [Provider.SACYR]: 'SACYR',
  [Provider.EA]: 'EA',
  [Provider.SENER]: 'SENER',
  [Provider.TRESCA]: 'TRESCA',
  [Provider.WORLEY]: 'WORLEY'
};

export type ProviderName = keyof typeof Provider;
export type EvaluationTypeName = keyof typeof EvaluationType;

// --- Dynamic provider helpers ---

/** 12+ colour palette for providers beyond the legacy 7 */
export const DYNAMIC_PROVIDER_PALETTE: string[] = [
  '#6366f1', '#14b8a6', '#f43f5e', '#8b5cf6', '#06b6d4',
  '#d946ef', '#0ea5e9', '#84cc16', '#f97316', '#e11d48',
  '#7c3aed', '#059669'
];

/** Original 7 provider colours (must never change) */
export const LEGACY_PROVIDER_COLORS: Record<string, string> = {
  TECNICASREUNIDAS: '#12b5b0',
  TR: '#12b5b0',
  IDOM: '#6366f1',
  SACYR: '#8b5cf6',
  EA: '#ec4899',
  SENER: '#f59e0b',
  TRESCA: '#10b981',
  WORLEY: '#3b82f6'
};

/** Display names for the original 7 */
export const LEGACY_DISPLAY_NAMES: Record<string, string> = {
  TECNICASREUNIDAS: 'TR',
  TR: 'TR',
  IDOM: 'IDOM',
  SACYR: 'SACYR',
  EA: 'EA',
  SENER: 'SENER',
  TRESCA: 'TRESCA',
  WORLEY: 'WORLEY'
};

/** Full display names for the original 7 */
export const LEGACY_FULL_DISPLAY_NAMES: Record<string, string> = {
  TECNICASREUNIDAS: 'Técnicas Reunidas',
  TR: 'Técnicas Reunidas',
  IDOM: 'IDOM',
  SACYR: 'SACYR',
  EA: 'Empresarios Agrupados',
  SENER: 'SENER',
  TRESCA: 'TRESCA',
  WORLEY: 'WORLEY'
};

/**
 * Get a colour for a provider. Legacy providers keep their historical colour;
 * new providers get a deterministic colour from the palette based on their
 * position in the allProviders list.
 */
export function getProviderColor(name: string, allProviders: string[]): string {
  const key = name.toUpperCase().trim();
  if (LEGACY_PROVIDER_COLORS[key]) return LEGACY_PROVIDER_COLORS[key];
  // Deterministic index based on position among non-legacy providers
  const nonLegacy = allProviders
    .map(p => p.toUpperCase().trim())
    .filter(p => !LEGACY_PROVIDER_COLORS[p]);
  const idx = nonLegacy.indexOf(key);
  return DYNAMIC_PROVIDER_PALETTE[(idx >= 0 ? idx : 0) % DYNAMIC_PROVIDER_PALETTE.length];
}

/**
 * Get a short display name for a provider.
 * Legacy providers return their canonical short name; others return the original string.
 */
export function getProviderDisplayName(name: string): string {
  const key = name.toUpperCase().trim();
  return LEGACY_DISPLAY_NAMES[key] || name;
}

/**
 * Get the full display name for a provider.
 */
export function getProviderFullDisplayName(name: string): string {
  const key = name.toUpperCase().trim();
  return LEGACY_FULL_DISPLAY_NAMES[key] || name;
}
