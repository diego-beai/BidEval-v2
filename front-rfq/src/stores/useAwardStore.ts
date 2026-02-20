import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { supabase } from '../lib/supabase';
import { API_CONFIG } from '../config/constants';
import { fetchWithTimeout } from '../services/api.service';

export type AwardStatus = 'draft' | 'pending_approval' | 'approved' | 'notified' | 'contracted' | 'cancelled';

export interface ProjectAward {
  id: string;
  project_id: string;
  winner_provider_name: string;
  justification: string;
  award_status: AwardStatus;
  award_date?: string | null;
  contract_reference?: string | null;
  contract_data?: any;
  award_document_url?: string | null;
  contract_document_url?: string | null;
  awarded_by: string;
  approved_by?: string | null;
  approved_at?: string | null;
  created_at: string;
  updated_at: string;
}

interface AwardStore {
  award: ProjectAward | null;
  isLoading: boolean;
  isGeneratingJustification: boolean;
  generatedJustification: string;
  error: string | null;

  loadAward: (projectId: string) => Promise<void>;
  generateJustification: (payload: AwardJustificationPayload) => Promise<string>;
  createAward: (projectId: string, winnerName: string, justification: string) => Promise<ProjectAward | null>;
  updateAwardStatus: (awardId: string, status: AwardStatus) => Promise<void>;
  cancelAward: (awardId: string) => Promise<void>;
  lockProject: (projectId: string) => Promise<void>;
  unlockProject: (projectId: string) => Promise<void>;
  resetJustification: () => void;
}

export interface AwardJustificationPayload {
  project_name: string;
  project_type: string;
  winner_name: string;
  winner_score: number;
  runner_up_name?: string;
  runner_up_score?: number;
  total_providers: number;
  category_scores: Record<string, number>;
  strengths: string[];
  weaknesses: string[];
  economic_summary?: string;
  scoring_criteria_summary: string;
}

export const useAwardStore = create<AwardStore>()(
  devtools(
    (set) => ({
      award: null,
      isLoading: false,
      isGeneratingJustification: false,
      generatedJustification: '',
      error: null,

      loadAward: async (projectId: string) => {
        if (!supabase) return;
        set({ isLoading: true, error: null });
        try {
          const { data, error } = await supabase
            .from('project_awards' as any)
            .select('*')
            .eq('project_id', projectId)
            .maybeSingle() as any;

          if (error) throw error;
          set({ award: data as ProjectAward | null, isLoading: false });
        } catch (err: any) {
          set({ error: err.message, isLoading: false });
        }
      },

      generateJustification: async (payload: AwardJustificationPayload) => {
        set({ isGeneratingJustification: true, error: null });
        try {
          const webhookUrl = API_CONFIG.N8N_RFP_GENERATE_URL; // Reuse RFP endpoint for generation
          const response = await fetchWithTimeout(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'generate_award_justification',
              ...payload,
            }),
          });

          if (!response.ok) {
            // Fallback: generate client-side if n8n is not available
            const justification = generateLocalJustification(payload);
            set({ generatedJustification: justification, isGeneratingJustification: false });
            return justification;
          }

          const result = await response.json();
          const justification = result.justification || result.text || result.content || generateLocalJustification(payload);
          set({ generatedJustification: justification, isGeneratingJustification: false });
          return justification;
        } catch {
          // Fallback to local generation
          const justification = generateLocalJustification(payload);
          set({ generatedJustification: justification, isGeneratingJustification: false });
          return justification;
        }
      },

      createAward: async (projectId, winnerName, justification) => {
        if (!supabase) return null;
        set({ isLoading: true, error: null });
        try {
          const insert = {
            project_id: projectId,
            winner_provider_name: winnerName,
            justification,
            award_status: 'draft',
            award_date: new Date().toISOString(),
            awarded_by: 'user',
          };

          const { data, error } = await supabase
            .from('project_awards' as any)
            .insert(insert as any)
            .select()
            .single() as any;

          if (error) throw error;

          const award = data as ProjectAward;
          set({ award, isLoading: false });

          // Lock the project
          await (supabase
            .from('projects') as any)
            .update({
              is_locked: true,
              locked_at: new Date().toISOString(),
              locked_by: 'user',
            })
            .eq('id', projectId);

          return award;
        } catch (err: any) {
          set({ error: err.message, isLoading: false });
          return null;
        }
      },

      updateAwardStatus: async (awardId, status) => {
        if (!supabase) return;
        try {
          const updateData: any = { award_status: status };
          if (status === 'approved') {
            updateData.approved_by = 'user';
            updateData.approved_at = new Date().toISOString();
          }

          await (supabase
            .from('project_awards' as any) as any)
            .update(updateData)
            .eq('id', awardId);

          set(state => ({
            award: state.award ? { ...state.award, award_status: status, ...updateData } : null,
          }));
        } catch (err: any) {
          set({ error: err.message });
        }
      },

      cancelAward: async (awardId) => {
        if (!supabase) return;
        try {
          const award = useAwardStore.getState().award;
          if (!award) return;

          await (supabase
            .from('project_awards' as any) as any)
            .update({ award_status: 'cancelled' })
            .eq('id', awardId);

          // Unlock the project
          await (supabase
            .from('projects') as any)
            .update({
              is_locked: false,
              locked_at: null,
              locked_by: null,
            })
            .eq('id', award.project_id);

          set({ award: { ...award, award_status: 'cancelled' } });
        } catch (err: any) {
          set({ error: err.message });
        }
      },

      lockProject: async (projectId) => {
        if (!supabase) return;
        await (supabase
          .from('projects') as any)
          .update({ is_locked: true, locked_at: new Date().toISOString(), locked_by: 'user' })
          .eq('id', projectId);
      },

      unlockProject: async (projectId) => {
        if (!supabase) return;
        await (supabase
          .from('projects') as any)
          .update({ is_locked: false, locked_at: null, locked_by: null })
          .eq('id', projectId);
      },

      resetJustification: () => set({ generatedJustification: '' }),
    }),
    { name: 'award-store' }
  )
);

/** Fallback: generate justification locally when n8n is unavailable */
function generateLocalJustification(p: AwardJustificationPayload): string {
  const lang = (localStorage.getItem('language-storage') || '').includes('"es"') ? 'es' : 'en';
  const date = new Date().toLocaleDateString(lang === 'es' ? 'es-ES' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const diff = (p.winner_score - (p.runner_up_score || 0)).toFixed(2);

  if (lang === 'es') {
    let md = `# Propuesta de Adjudicacion\n\n`;
    md += `**Proyecto:** ${p.project_name} (${p.project_type})  \n`;
    md += `**Fecha:** ${date}  \n`;
    md += `**Proveedores evaluados:** ${p.total_providers}\n\n`;
    md += `---\n\n`;
    md += `## 1. Resumen del Proceso\n\n`;
    md += `Se han evaluado **${p.total_providers} proveedores** mediante un modelo de evaluacion ponderada multi-criterio con los siguientes pesos:\n\n`;
    const criteria = p.scoring_criteria_summary.split(', ');
    criteria.forEach(c => { md += `- ${c}\n`; });
    md += `\n## 2. Proveedor Recomendado\n\n`;
    md += `Se recomienda la adjudicacion a **${p.winner_name}** con una puntuacion global de **${p.winner_score.toFixed(2)}/10**.\n\n`;
    if (p.runner_up_name) {
      md += `| Posicion | Proveedor | Puntuacion |\n`;
      md += `|----------|-----------|------------|\n`;
      md += `| 1 | **${p.winner_name}** | ${p.winner_score.toFixed(2)}/10 |\n`;
      md += `| 2 | ${p.runner_up_name} | ${p.runner_up_score?.toFixed(2)}/10 |\n\n`;
      md += `> Diferencia entre 1 y 2: **${diff} puntos**\n\n`;
    }
    md += `## 3. Fortalezas del Ganador\n\n`;
    p.strengths.forEach(s => { md += `- ${s}\n`; });
    md += `\n## 4. Areas de Atencion\n\n`;
    p.weaknesses.forEach(w => { md += `- ${w}\n`; });
    md += `\n## 5. Puntuaciones por Categoria\n\n`;
    md += `| Categoria | Puntuacion |\n`;
    md += `|-----------|------------|\n`;
    Object.entries(p.category_scores).forEach(([cat, score]) => {
      md += `| ${cat} | ${(score as number).toFixed(1)}/10 |\n`;
    });
    md += `\n## 6. Recomendacion\n\n`;
    md += `Por todo lo anterior, se recomienda adjudicar el contrato del proyecto **"${p.project_name}"** a **${p.winner_name}**, al haber obtenido la mayor puntuacion en la evaluacion integral de las ofertas recibidas.\n`;
    return md;
  }

  let md = `# Award Proposal\n\n`;
  md += `**Project:** ${p.project_name} (${p.project_type})  \n`;
  md += `**Date:** ${date}  \n`;
  md += `**Providers evaluated:** ${p.total_providers}\n\n`;
  md += `---\n\n`;
  md += `## 1. Process Summary\n\n`;
  md += `**${p.total_providers} providers** were evaluated using a weighted multi-criteria model with the following weights:\n\n`;
  const criteria = p.scoring_criteria_summary.split(', ');
  criteria.forEach(c => { md += `- ${c}\n`; });
  md += `\n## 2. Recommended Provider\n\n`;
  md += `The contract is recommended to be awarded to **${p.winner_name}** with an overall score of **${p.winner_score.toFixed(2)}/10**.\n\n`;
  if (p.runner_up_name) {
    md += `| Position | Provider | Score |\n`;
    md += `|----------|----------|-------|\n`;
    md += `| 1 | **${p.winner_name}** | ${p.winner_score.toFixed(2)}/10 |\n`;
    md += `| 2 | ${p.runner_up_name} | ${p.runner_up_score?.toFixed(2)}/10 |\n\n`;
    md += `> Difference: **${diff} points**\n\n`;
  }
  md += `## 3. Winner Strengths\n\n`;
  p.strengths.forEach(s => { md += `- ${s}\n`; });
  md += `\n## 4. Areas of Attention\n\n`;
  p.weaknesses.forEach(w => { md += `- ${w}\n`; });
  md += `\n## 5. Category Scores\n\n`;
  md += `| Category | Score |\n`;
  md += `|----------|-------|\n`;
  Object.entries(p.category_scores).forEach(([cat, score]) => {
    md += `| ${cat} | ${(score as number).toFixed(1)}/10 |\n`;
  });
  md += `\n## 6. Recommendation\n\n`;
  md += `Based on the above, it is recommended to award the contract for project **"${p.project_name}"** to **${p.winner_name}**, having achieved the highest score in the comprehensive evaluation of submitted proposals.\n`;
  return md;
}
