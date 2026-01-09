import type { Disciplina as DisciplinaType, EstadoPregunta as EstadoPreguntaType, Importancia as ImportanciaType } from './database.types';

/**
 * Tipos del módulo Q&A & Technical Audit
 */

// Re-exportar tipos para facilitar imports
export type Disciplina = DisciplinaType;
export type EstadoPregunta = EstadoPreguntaType;
export type Importancia = ImportanciaType;

// Pregunta generada por IA
export interface QAQuestion {
  id: string;
  created_at: string;
  project_id: string;
  proveedor: string;
  disciplina: Disciplina;
  pregunta_texto: string;
  estado: EstadoPregunta;
  importancia?: Importancia | null;
  respuesta_proveedor?: string | null;
  fecha_respuesta?: string | null;
  notas_internas?: string | null;
}

// Filtros para el módulo
export interface QAFilters {
  proveedor?: string | null;
  disciplina?: Disciplina | null;
  estado?: EstadoPregunta | null;
  importancia?: Importancia | null;
}

// Estadísticas por disciplina
export interface DisciplinaStats {
  disciplina: Disciplina;
  total: number;
  porEstado: Record<EstadoPregunta, number>;
  porImportancia: Record<Importancia, number>;
}

// Payload para el webhook de n8n (generación de auditoría)
export interface GenerateAuditPayload {
  project_id: string;
  provider: string;
}

// Respuesta del webhook de n8n
export interface GenerateAuditResponse {
  success: boolean;
  preguntas_generadas: number;
  message?: string;
  data?: any[];
}

// Acciones disponibles para una pregunta
export type QAAction = 'edit' | 'approve' | 'discard' | 'send' | 'delete';

// Vista agrupada por disciplina
export interface DisciplinaGroup {
  disciplina: Disciplina;
  preguntas: QAQuestion[];
  stats: {
    total: number;
    borradores: number;
    aprobadas: number;
    pendientes: number;
    alta: number;
    media: number;
    baja: number;
  };
}
