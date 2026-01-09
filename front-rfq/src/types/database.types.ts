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

export interface Database {
  public: {
    Tables: {
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
    }
    Views: {
      [_ in never]: never
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

export type Disciplina = 'Eléctrica' | 'Mecánica' | 'Civil' | 'Proceso' | 'General'
export type EstadoPregunta = 'Borrador' | 'Pendiente' | 'Aprobada' | 'Enviada' | 'Respondida' | 'Descartada'
export type Importancia = 'Alta' | 'Media' | 'Baja'
