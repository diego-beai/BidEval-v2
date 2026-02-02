/**
 * Tipos generados para las tablas de Supabase
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

/**
 * Scoring weights structure for provider evaluation
 * Dynamic: supports any number of criteria with arbitrary names.
 * Each key is a criterion name, each value is its weight (0-100).
 *
 * Default categories and weights:
 * - TECHNICAL COMPLETENESS: 30% (scope_facilities, scope_work, deliverables_quality)
 * - ECONOMIC COMPETITIVENESS: 35% (total_price, price_breakdown, optionals_included, capex_opex_methodology)
 * - EXECUTION CAPABILITY: 20% (schedule, resources_allocation, exceptions)
 * - HSE & COMPLIANCE: 15% (safety_studies, regulatory_compliance)
 */
export type ScoringWeights = Record<string, number>

/**
 * Estructura del mensaje JSON almacenado en n8n_chat_history
 */
export interface N8nChatMessage {
  type: 'ai' | 'human'
  content: string
  additional_kwargs?: Record<string, unknown>
  response_metadata?: Record<string, unknown>
  tool_calls?: unknown[]
  invalid_tool_calls?: unknown[]
}

// Enums defined before Database interface (used in table definitions)
export type Disciplina = 'Electrical' | 'Mechanical' | 'Civil' | 'Process' | 'General' | 'Cost'
export type EstadoPregunta = 'Draft' | 'Pending' | 'Approved' | 'Sent' | 'Answered' | 'Resolved' | 'NeedsMoreInfo' | 'Discarded'
export type Importancia = 'High' | 'Medium' | 'Low'
export type NotificationType = 'supplier_responded' | 'evaluation_updated' | 'questions_sent'

export interface Database {
  public: {
    Tables: {
      projects: {
        Row: {
          id: string
          name: string
          display_name: string
          description?: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          display_name: string
          description?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          display_name?: string
          description?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      QA_PENDIENTE: {
        Row: {
          id: string
          created_at: string
          project_id: string
          proveedor: string
          disciplina: Disciplina
          pregunta_texto: string
          estado: EstadoPregunta
          importancia?: Importancia | null
          respuesta_proveedor?: string | null
          fecha_respuesta?: string | null
          notas_internas?: string | null
        }
        Insert: {
          id?: string
          created_at?: string
          project_id: string
          proveedor: string
          disciplina: Disciplina
          pregunta_texto: string
          estado?: EstadoPregunta
          importancia?: Importancia | null
          respuesta_proveedor?: string | null
          fecha_respuesta?: string | null
          notas_internas?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          project_id?: string
          proveedor?: string
          disciplina?: Disciplina
          pregunta_texto?: string
          estado?: EstadoPregunta
          importancia?: Importancia | null
          respuesta_proveedor?: string | null
          fecha_respuesta?: string | null
          notas_internas?: string | null
        }
      }
      ranking_proveedores: {
        Row: {
          id: string
          provider_name: string
          project_id: string | null
          // Category scores
          technical_score: number | null
          economic_score: number | null
          execution_score: number | null
          hse_compliance_score: number | null
          // Technical Completeness individual scores (30%)
          scope_facilities_score: number | null
          scope_work_score: number | null
          deliverables_quality_score: number | null
          // Economic Competitiveness individual scores (35%)
          total_price_score: number | null
          price_breakdown_score: number | null
          optionals_included_score: number | null
          capex_opex_methodology_score: number | null
          // Execution Capability individual scores (20%)
          schedule_score: number | null
          resources_allocation_score: number | null
          exceptions_score: number | null
          // HSE & Compliance individual scores (15%)
          safety_studies_score: number | null
          regulatory_compliance_score: number | null
          // Overall
          overall_score: number | null
          compliance_percentage: number | null
          // Dynamic scoring JSONB fields
          category_scores_json: Record<string, number> | null
          individual_scores_json: Record<string, number> | null
          evaluation_details: Record<string, unknown> | null
          evaluation_count: number
          last_updated: string
          created_at: string
        }
        Insert: {
          id?: string
          provider_name: string
          project_id?: string | null
          technical_score?: number | null
          economic_score?: number | null
          execution_score?: number | null
          hse_compliance_score?: number | null
          scope_facilities_score?: number | null
          scope_work_score?: number | null
          deliverables_quality_score?: number | null
          total_price_score?: number | null
          price_breakdown_score?: number | null
          optionals_included_score?: number | null
          capex_opex_methodology_score?: number | null
          schedule_score?: number | null
          resources_allocation_score?: number | null
          exceptions_score?: number | null
          safety_studies_score?: number | null
          regulatory_compliance_score?: number | null
          overall_score?: number | null
          compliance_percentage?: number | null
          category_scores_json?: Record<string, number> | null
          individual_scores_json?: Record<string, number> | null
          evaluation_details?: Record<string, unknown> | null
          evaluation_count?: number
          last_updated?: string
          created_at?: string
        }
        Update: {
          id?: string
          provider_name?: string
          project_id?: string | null
          technical_score?: number | null
          economic_score?: number | null
          execution_score?: number | null
          hse_compliance_score?: number | null
          scope_facilities_score?: number | null
          scope_work_score?: number | null
          deliverables_quality_score?: number | null
          total_price_score?: number | null
          price_breakdown_score?: number | null
          optionals_included_score?: number | null
          capex_opex_methodology_score?: number | null
          schedule_score?: number | null
          resources_allocation_score?: number | null
          exceptions_score?: number | null
          safety_studies_score?: number | null
          regulatory_compliance_score?: number | null
          overall_score?: number | null
          compliance_percentage?: number | null
          category_scores_json?: Record<string, number> | null
          individual_scores_json?: Record<string, number> | null
          evaluation_details?: Record<string, unknown> | null
          evaluation_count?: number
          last_updated?: string
          created_at?: string
        }
      }
      n8n_chat_histories: {
        Row: {
          id: number
          session_id: string
          message: N8nChatMessage
        }
        Insert: {
          id?: number
          session_id: string
          message: N8nChatMessage
        }
        Update: {
          id?: number
          session_id?: string
          message?: N8nChatMessage
        }
      }
      scoring_weight_configs: {
        Row: {
          id: string
          name: string
          weights: ScoringWeights
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name?: string
          weights: ScoringWeights
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          weights?: ScoringWeights
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      qa_notifications: {
        Row: {
          id: string
          project_id: string
          provider_name: string
          notification_type: NotificationType
          title: string
          message: string | null
          metadata: Json | null
          is_read: boolean
          created_at: string
          read_at: string | null
        }
        Insert: {
          id?: string
          project_id: string
          provider_name: string
          notification_type: NotificationType
          title: string
          message?: string | null
          metadata?: Json | null
          is_read?: boolean
          created_at?: string
          read_at?: string | null
        }
        Update: {
          id?: string
          project_id?: string
          provider_name?: string
          notification_type?: NotificationType
          title?: string
          message?: string | null
          metadata?: Json | null
          is_read?: boolean
          created_at?: string
          read_at?: string | null
        }
      }
    }
    Views: {
      v_projects_with_stats: {
        Row: {
          id: string
          name: string
          display_name: string
          description?: string | null
          created_at: string
          updated_at: string
          document_count: number
          requirement_count: number
          qa_count: number
        }
      }
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      disciplina: Disciplina
      estado_pregunta: EstadoPregunta
      importancia: Importancia
    }
  }
}

/**
 * QA Notification for tracking supplier responses and evaluation updates
 * Corresponds to qa_notifications table
 */
export interface QANotification {
  id: string
  project_id: string
  provider_name: string
  notification_type: NotificationType
  title: string
  message?: string | null
  metadata?: {
    response_count?: number
    token_id?: string
    question_ids?: string[]
  } | null
  is_read: boolean
  created_at: string
  read_at?: string | null
}
