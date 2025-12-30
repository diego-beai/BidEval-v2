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
  PRE_FEED = 'Pre-FEED Deliverables',
  FEED = 'FEED Deliverables'
}

export type ProviderName = keyof typeof Provider;
export type EvaluationTypeName = keyof typeof EvaluationType;
