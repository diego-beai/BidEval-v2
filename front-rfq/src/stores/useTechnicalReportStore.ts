import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { supabase } from '../lib/supabase';

export type ReportType = 'evaluation' | 'comparison' | 'executive_summary' | 'award_justification';

export interface TechnicalReportRow {
  id: string;
  project_id: string;
  version: number;
  report_type: ReportType;
  title: string;
  report_data: any;
  generated_by: string;
  pdf_url?: string | null;
  created_at: string;
}

export interface TechnicalReportData {
  methodology: {
    description: string;
    scoring_model: string;
    categories: Array<{ name: string; weight: number; criteria_count: number }>;
    total_weight: number;
  };
  ranking: Array<{
    position: number;
    provider_name: string;
    overall_score: number;
    category_scores: Record<string, number>;
    strengths: string[];
    weaknesses: string[];
    compliance_percentage: number;
  }>;
  analysis: {
    score_distribution: { min: number; max: number; avg: number; std_dev: number };
    winner_margin: number;
    risk_factors: string[];
    recommendations: string[];
  };
  change_log: Array<{
    date: string;
    change_type: string;
    field: string;
    description: string;
  }>;
  generated_at: string;
  generated_by: string;
}

interface TechnicalReportStore {
  reports: TechnicalReportRow[];
  activeReport: TechnicalReportRow | null;
  isLoading: boolean;
  isGenerating: boolean;
  error: string | null;

  loadReports: (projectId: string) => Promise<void>;
  generateReport: (projectId: string, reportType: ReportType, title: string, data: TechnicalReportData) => Promise<TechnicalReportRow | null>;
  deleteReport: (reportId: string) => Promise<void>;
  setActiveReport: (report: TechnicalReportRow | null) => void;
}

export const useTechnicalReportStore = create<TechnicalReportStore>()(
  devtools(
    (set) => ({
      reports: [],
      activeReport: null,
      isLoading: false,
      isGenerating: false,
      error: null,

      loadReports: async (projectId: string) => {
        if (!supabase) return;
        set({ isLoading: true, error: null });
        try {
          const { data, error } = await supabase
            .from('technical_reports' as any)
            .select('*')
            .eq('project_id', projectId)
            .order('created_at', { ascending: false });

          if (error) throw error;
          set({ reports: (data as any as TechnicalReportRow[]) || [], isLoading: false });
        } catch (err: any) {
          set({ error: err.message, isLoading: false });
        }
      },

      generateReport: async (projectId, reportType, title, data) => {
        if (!supabase) return null;
        set({ isGenerating: true, error: null });
        try {
          // Get next version number
          const { data: existing } = await supabase
            .from('technical_reports' as any)
            .select('version')
            .eq('project_id', projectId)
            .eq('report_type', reportType)
            .order('version', { ascending: false })
            .limit(1) as any;

          const nextVersion = existing && existing.length > 0 ? ((existing[0] as any).version || 0) + 1 : 1;

          const insert = {
            project_id: projectId,
            report_type: reportType,
            title,
            version: nextVersion,
            report_data: data,
            generated_by: 'user',
          };

          const { data: created, error } = await supabase
            .from('technical_reports' as any)
            .insert(insert as any)
            .select()
            .single() as any;

          if (error) throw error;

          const report = created as TechnicalReportRow;
          set(state => ({
            reports: [report, ...state.reports],
            activeReport: report,
            isGenerating: false,
          }));
          return report;
        } catch (err: any) {
          set({ error: err.message, isGenerating: false });
          return null;
        }
      },

      deleteReport: async (reportId: string) => {
        if (!supabase) return;
        try {
          await supabase.from('technical_reports' as any).delete().eq('id', reportId);
          set(state => ({
            reports: state.reports.filter(r => r.id !== reportId),
            activeReport: state.activeReport?.id === reportId ? null : state.activeReport,
          }));
        } catch (err: any) {
          set({ error: err.message });
        }
      },

      setActiveReport: (report) => set({ activeReport: report }),
    }),
    { name: 'technical-report-store' }
  )
);
