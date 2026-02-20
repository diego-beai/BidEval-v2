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
export type MilestoneType = 'opening' | 'submission' | 'questions' | 'evaluation' | 'award' | 'negotiation' | 'due_diligence' | 'kickoff' | 'custom'
export type DocCategory = 'technical' | 'economic' | 'administrative' | 'legal' | 'hse' | 'custom'
export type EvaluationLink = 'technical' | 'economic' | 'info'
export type EconomicFieldType = 'currency' | 'percentage' | 'number' | 'text' | 'formula'
export type ScoringChangeType = 'score_update' | 'weight_change' | 'criteria_change' | 'recalculation' | 'manual_override'
export type AwardStatus = 'draft' | 'pending_approval' | 'approved' | 'notified' | 'contracted' | 'cancelled'
export type ReportType = 'evaluation' | 'comparison' | 'executive_summary' | 'award_justification'

export interface Database {
  public: {
    Tables: {
      projects: {
        Row: {
          id: string
          name: string
          display_name: string
          description?: string | null
          status: string
          ai_context?: string | null
          is_active: boolean
          project_type: 'RFP' | 'RFQ' | 'RFI'
          disciplines?: string[] | null
          reference_code?: string | null
          owner_name?: string | null
          date_opening?: string | null
          date_submission_deadline?: string | null
          date_questions_deadline?: string | null
          date_questions_response?: string | null
          date_evaluation?: string | null
          date_award?: string | null
          invited_suppliers: string[]
          organization_id?: string | null
          created_by?: string | null
          is_locked: boolean
          locked_at?: string | null
          locked_by?: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          display_name: string
          description?: string | null
          status?: string
          ai_context?: string | null
          is_active?: boolean
          project_type?: 'RFP' | 'RFQ' | 'RFI'
          disciplines?: string[] | null
          reference_code?: string | null
          owner_name?: string | null
          date_opening?: string | null
          date_submission_deadline?: string | null
          date_questions_deadline?: string | null
          date_questions_response?: string | null
          date_evaluation?: string | null
          date_award?: string | null
          invited_suppliers?: string[]
          organization_id?: string | null
          created_by?: string | null
          is_locked?: boolean
          locked_at?: string | null
          locked_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          display_name?: string
          description?: string | null
          status?: string
          ai_context?: string | null
          is_active?: boolean
          project_type?: 'RFP' | 'RFQ' | 'RFI'
          disciplines?: string[] | null
          reference_code?: string | null
          owner_name?: string | null
          date_opening?: string | null
          date_submission_deadline?: string | null
          date_questions_deadline?: string | null
          date_questions_response?: string | null
          date_evaluation?: string | null
          date_award?: string | null
          invited_suppliers?: string[]
          organization_id?: string | null
          created_by?: string | null
          is_locked?: boolean
          locked_at?: string | null
          locked_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      project_providers: {
        Row: {
          id: string
          project_id: string
          provider_name: string
          provider_email?: string | null
          provider_contact?: string | null
          status: 'invited' | 'accepted' | 'declined' | 'submitted' | 'disqualified'
          invited_at: string
          responded_at?: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          project_id: string
          provider_name: string
          provider_email?: string | null
          provider_contact?: string | null
          status?: 'invited' | 'accepted' | 'declined' | 'submitted' | 'disqualified'
          invited_at?: string
          responded_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          provider_name?: string
          provider_email?: string | null
          provider_contact?: string | null
          status?: 'invited' | 'accepted' | 'declined' | 'submitted' | 'disqualified'
          invited_at?: string
          responded_at?: string | null
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
      qa_audit: {
        Row: {
          id: string
          requirement_id?: string | null
          project_id: string
          provider_name: string
          discipline?: string | null
          question: string
          importance?: Importancia | null
          status: EstadoPregunta
          response?: string | null
          parent_question_id?: string | null
          responded_at?: string | null
          response_source?: 'portal' | 'manual' | 'email' | null
          created_at: string
        }
        Insert: {
          id?: string
          requirement_id?: string | null
          project_id: string
          provider_name: string
          discipline?: string | null
          question: string
          importance?: Importancia | null
          status?: EstadoPregunta
          response?: string | null
          parent_question_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          requirement_id?: string | null
          project_id?: string
          provider_name?: string
          discipline?: string | null
          question?: string
          importance?: Importancia | null
          status?: EstadoPregunta
          response?: string | null
          parent_question_id?: string | null
          responded_at?: string | null
          response_source?: 'portal' | 'manual' | 'email' | null
          created_at?: string
        }
      }
      economic_offers: {
        Row: {
          id: string
          project_id: string
          provider_name: string
          total_price?: number | null
          currency: string
          price_breakdown: Record<string, number> | null
          payment_terms?: string | null
          payment_schedule: Array<{milestone: string; event: string}> | null
          discount_percentage: number
          discount_conditions?: string | null
          tco_value?: number | null
          tco_period_years?: number | null
          tco_breakdown: Record<string, number> | null
          validity_days: number
          price_escalation?: string | null
          guarantees?: string | null
          insurance_included: boolean
          taxes_included: boolean
          optional_items: Array<{description: string; price: number}> | null
          alternative_offers: Array<{description: string; total_price: number; details?: string}> | null
          extraction_confidence?: number | null
          raw_notes?: string | null
          excel_template_data?: Json | null
          custom_fields?: Json | null
          validation_errors?: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          project_id: string
          provider_name: string
          total_price?: number | null
          currency?: string
          price_breakdown?: Record<string, number> | null
          payment_terms?: string | null
          payment_schedule?: Array<{milestone: string; event: string}> | null
          discount_percentage?: number
          discount_conditions?: string | null
          tco_value?: number | null
          tco_period_years?: number | null
          tco_breakdown?: Record<string, number> | null
          validity_days?: number
          price_escalation?: string | null
          guarantees?: string | null
          insurance_included?: boolean
          taxes_included?: boolean
          optional_items?: Array<{description: string; price: number}> | null
          alternative_offers?: Array<{description: string; total_price: number; details?: string}> | null
          extraction_confidence?: number | null
          raw_notes?: string | null
          excel_template_data?: Json | null
          custom_fields?: Json | null
          validation_errors?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          provider_name?: string
          total_price?: number | null
          currency?: string
          price_breakdown?: Record<string, number> | null
          payment_terms?: string | null
          payment_schedule?: Array<{milestone: string; event: string}> | null
          discount_percentage?: number
          discount_conditions?: string | null
          tco_value?: number | null
          tco_period_years?: number | null
          tco_breakdown?: Record<string, number> | null
          validity_days?: number
          price_escalation?: string | null
          guarantees?: string | null
          insurance_included?: boolean
          taxes_included?: boolean
          optional_items?: Array<{description: string; price: number}> | null
          alternative_offers?: Array<{description: string; total_price: number; details?: string}> | null
          extraction_confidence?: number | null
          raw_notes?: string | null
          excel_template_data?: Json | null
          custom_fields?: Json | null
          validation_errors?: Json | null
          created_at?: string
          updated_at?: string
        }
      }
      pdf_template_config: {
        Row: {
          id: string
          org_id: string | null
          company_name: string
          logo_data_url: string
          primary_color: string
          footer_text: string
          show_page_numbers: boolean
          updated_at: string
        }
        Insert: {
          id?: string
          org_id?: string | null
          company_name?: string
          logo_data_url?: string
          primary_color?: string
          footer_text?: string
          show_page_numbers?: boolean
          updated_at?: string
        }
        Update: {
          id?: string
          org_id?: string | null
          company_name?: string
          logo_data_url?: string
          primary_color?: string
          footer_text?: string
          show_page_numbers?: boolean
          updated_at?: string
        }
      }
      organizations: {
        Row: {
          id: string
          name: string
          slug: string
          plan: 'trial' | 'starter' | 'professional' | 'enterprise'
          max_projects: number
          max_users: number
          settings: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          plan?: 'trial' | 'starter' | 'professional' | 'enterprise'
          max_projects?: number
          max_users?: number
          settings?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          plan?: 'trial' | 'starter' | 'professional' | 'enterprise'
          max_projects?: number
          max_users?: number
          settings?: Json
          created_at?: string
          updated_at?: string
        }
      }
      organization_members: {
        Row: {
          id: string
          organization_id: string
          user_id: string
          role: 'owner' | 'admin' | 'member' | 'viewer'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          user_id: string
          role?: 'owner' | 'admin' | 'member' | 'viewer'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          user_id?: string
          role?: 'owner' | 'admin' | 'member' | 'viewer'
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
      project_milestones: {
        Row: {
          id: string
          project_id: string
          name: string
          description?: string | null
          due_date?: string | null
          sort_order: number
          is_mandatory: boolean
          is_completed: boolean
          completed_at?: string | null
          milestone_type: MilestoneType
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          project_id: string
          name: string
          description?: string | null
          due_date?: string | null
          sort_order?: number
          is_mandatory?: boolean
          is_completed?: boolean
          completed_at?: string | null
          milestone_type?: MilestoneType
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          name?: string
          description?: string | null
          due_date?: string | null
          sort_order?: number
          is_mandatory?: boolean
          is_completed?: boolean
          completed_at?: string | null
          milestone_type?: MilestoneType
          created_at?: string
          updated_at?: string
        }
      }
      project_document_types: {
        Row: {
          id: string
          project_id: string
          name: string
          description?: string | null
          doc_category: DocCategory
          evaluation_link: EvaluationLink
          is_mandatory: boolean
          sort_order: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          project_id: string
          name: string
          description?: string | null
          doc_category?: DocCategory
          evaluation_link?: EvaluationLink
          is_mandatory?: boolean
          sort_order?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          name?: string
          description?: string | null
          doc_category?: DocCategory
          evaluation_link?: EvaluationLink
          is_mandatory?: boolean
          sort_order?: number
          created_at?: string
          updated_at?: string
        }
      }
      project_economic_fields: {
        Row: {
          id: string
          project_id: string
          parent_id?: string | null
          name: string
          description?: string | null
          field_type: EconomicFieldType
          unit?: string | null
          is_required: boolean
          sort_order: number
          formula?: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          project_id: string
          parent_id?: string | null
          name: string
          description?: string | null
          field_type?: EconomicFieldType
          unit?: string | null
          is_required?: boolean
          sort_order?: number
          formula?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          parent_id?: string | null
          name?: string
          description?: string | null
          field_type?: EconomicFieldType
          unit?: string | null
          is_required?: boolean
          sort_order?: number
          formula?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      project_setup_templates: {
        Row: {
          id: string
          name: string
          description?: string | null
          project_type: 'RFP' | 'RFQ' | 'RFI'
          template_data: Json
          organization_id?: string | null
          created_by?: string | null
          is_default: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          project_type?: 'RFP' | 'RFQ' | 'RFI'
          template_data?: Json
          organization_id?: string | null
          created_by?: string | null
          is_default?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          project_type?: 'RFP' | 'RFQ' | 'RFI'
          template_data?: Json
          organization_id?: string | null
          created_by?: string | null
          is_default?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      scoring_change_log: {
        Row: {
          id: string
          project_id: string
          provider_name: string
          changed_by: string
          change_type: ScoringChangeType
          field_changed: string
          old_value?: Json | null
          new_value?: Json | null
          reason?: string | null
          created_at: string
        }
        Insert: {
          id?: string
          project_id: string
          provider_name: string
          changed_by?: string
          change_type?: ScoringChangeType
          field_changed: string
          old_value?: Json | null
          new_value?: Json | null
          reason?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          provider_name?: string
          changed_by?: string
          change_type?: ScoringChangeType
          field_changed?: string
          old_value?: Json | null
          new_value?: Json | null
          reason?: string | null
          created_at?: string
        }
      }
      scoring_simulations: {
        Row: {
          id: string
          project_id: string
          name: string
          description?: string | null
          alternative_weights: Json
          results: Json
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          project_id: string
          name: string
          description?: string | null
          alternative_weights?: Json
          results?: Json
          created_by?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          name?: string
          description?: string | null
          alternative_weights?: Json
          results?: Json
          created_by?: string
          created_at?: string
          updated_at?: string
        }
      }
      project_awards: {
        Row: {
          id: string
          project_id: string
          winner_provider_name: string
          justification: string
          award_status: AwardStatus
          award_date?: string | null
          contract_reference?: string | null
          contract_data?: Json | null
          award_document_url?: string | null
          contract_document_url?: string | null
          awarded_by: string
          approved_by?: string | null
          approved_at?: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          project_id: string
          winner_provider_name: string
          justification: string
          award_status?: AwardStatus
          award_date?: string | null
          contract_reference?: string | null
          contract_data?: Json | null
          award_document_url?: string | null
          contract_document_url?: string | null
          awarded_by?: string
          approved_by?: string | null
          approved_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          winner_provider_name?: string
          justification?: string
          award_status?: AwardStatus
          award_date?: string | null
          contract_reference?: string | null
          contract_data?: Json | null
          award_document_url?: string | null
          contract_document_url?: string | null
          awarded_by?: string
          approved_by?: string | null
          approved_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      technical_reports: {
        Row: {
          id: string
          project_id: string
          version: number
          report_type: ReportType
          title: string
          report_data: Json
          generated_by: string
          pdf_url?: string | null
          created_at: string
        }
        Insert: {
          id?: string
          project_id: string
          version?: number
          report_type?: ReportType
          title: string
          report_data?: Json
          generated_by?: string
          pdf_url?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          version?: number
          report_type?: ReportType
          title?: string
          report_data?: Json
          generated_by?: string
          pdf_url?: string | null
          created_at?: string
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
      v_supplier_price_history: {
        Row: {
          provider_name: string
          project_id: string
          project_name: string
          project_type: string
          total_price?: number | null
          currency: string
          discount_percentage: number
          tco_value?: number | null
          overall_score?: number | null
          category_scores_json?: Record<string, number> | null
          project_date: string
          offer_date: string
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
      milestone_type: MilestoneType
      doc_category: DocCategory
      evaluation_link: EvaluationLink
      economic_field_type: EconomicFieldType
      scoring_change_type: ScoringChangeType
      award_status: AwardStatus
      report_type: ReportType
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
