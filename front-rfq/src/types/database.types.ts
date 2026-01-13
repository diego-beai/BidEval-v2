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
          cumplimiento_porcentual: number | null
          technical_score: number | null
          economical_score: number | null
          pre_feed_score: number | null
          feed_score: number | null
          overall_score: number | null
          evaluation_count: number
          last_updated: string
          created_at: string
        }
        Insert: {
          id?: string
          provider_name: string
          project_id?: string | null
          cumplimiento_porcentual?: number | null
          technical_score?: number | null
          economical_score?: number | null
          pre_feed_score?: number | null
          feed_score?: number | null
          overall_score?: number | null
          evaluation_count?: number
          last_updated?: string
          created_at?: string
        }
        Update: {
          id?: string
          provider_name?: string
          project_id?: string | null
          cumplimiento_porcentual?: number | null
          technical_score?: number | null
          economical_score?: number | null
          pre_feed_score?: number | null
          feed_score?: number | null
          overall_score?: number | null
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

export type Disciplina = 'Electrical' | 'Mechanical' | 'Civil' | 'Process' | 'General' | 'Cost'
export type EstadoPregunta = 'Draft' | 'Pending' | 'Approved' | 'Sent' | 'Answered' | 'Discarded'
export type Importancia = 'High' | 'Medium' | 'Low'
