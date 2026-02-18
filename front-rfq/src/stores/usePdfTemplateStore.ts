import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '../lib/supabase';

export interface PdfTemplateConfig {
  companyName: string;
  logoDataUrl: string;
  primaryColor: string;
  footerText: string;
  showPageNumbers: boolean;
}

interface PdfTemplateStore extends PdfTemplateConfig {
  isLoaded: boolean;
  isSaving: boolean;
  loadConfig: () => Promise<void>;
  updateConfig: (partial: Partial<PdfTemplateConfig>) => Promise<void>;
  resetConfig: () => Promise<void>;
  setLogo: (dataUrl: string) => Promise<void>;
}

const DEFAULT_CONFIG: PdfTemplateConfig = {
  companyName: '',
  logoDataUrl: '',
  primaryColor: '#0a2540',
  footerText: '',
  showPageNumbers: true,
};

// ID fijo de la fila global (hasta que se active multi-tenant)
const GLOBAL_ROW_ID = '00000000-0000-0000-0000-000000000001';

async function fetchFromSupabase(): Promise<PdfTemplateConfig | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('pdf_template_config')
    .select('company_name, logo_data_url, primary_color, footer_text, show_page_numbers')
    .eq('id', GLOBAL_ROW_ID)
    .single();
  if (error || !data) return null;
  return {
    companyName: data.company_name ?? '',
    logoDataUrl: data.logo_data_url ?? '',
    primaryColor: data.primary_color ?? '#0a2540',
    footerText: data.footer_text ?? '',
    showPageNumbers: data.show_page_numbers ?? true,
  };
}

async function saveToSupabase(config: PdfTemplateConfig): Promise<void> {
  if (!supabase) return;
  await supabase
    .from('pdf_template_config')
    .upsert({
      id: GLOBAL_ROW_ID,
      company_name: config.companyName,
      logo_data_url: config.logoDataUrl,
      primary_color: config.primaryColor,
      footer_text: config.footerText,
      show_page_numbers: config.showPageNumbers,
    });
}

export const usePdfTemplateStore = create<PdfTemplateStore>()(
  persist(
    (set, get) => ({
      ...DEFAULT_CONFIG,
      isLoaded: false,
      isSaving: false,

      loadConfig: async () => {
        if (get().isLoaded) return;
        const remote = await fetchFromSupabase();
        if (remote) {
          set({ ...remote, isLoaded: true });
        } else {
          set({ isLoaded: true });
        }
      },

      updateConfig: async (partial) => {
        set((state) => ({ ...state, ...partial, isSaving: true }));
        const current = get();
        const config: PdfTemplateConfig = {
          companyName: current.companyName,
          logoDataUrl: current.logoDataUrl,
          primaryColor: current.primaryColor,
          footerText: current.footerText,
          showPageNumbers: current.showPageNumbers,
        };
        await saveToSupabase(config);
        set({ isSaving: false });
      },

      resetConfig: async () => {
        set({ ...DEFAULT_CONFIG, isSaving: true });
        await saveToSupabase(DEFAULT_CONFIG);
        set({ isSaving: false });
      },

      setLogo: async (dataUrl) => {
        set({ logoDataUrl: dataUrl, isSaving: true });
        const current = get();
        const config: PdfTemplateConfig = {
          companyName: current.companyName,
          logoDataUrl: dataUrl,
          primaryColor: current.primaryColor,
          footerText: current.footerText,
          showPageNumbers: current.showPageNumbers,
        };
        await saveToSupabase(config);
        set({ isSaving: false });
      },
    }),
    {
      name: 'bideval-pdf-template',
      // Solo persistir la config, no los flags de estado
      partialize: (state) => ({
        companyName: state.companyName,
        logoDataUrl: state.logoDataUrl,
        primaryColor: state.primaryColor,
        footerText: state.footerText,
        showPageNumbers: state.showPageNumbers,
      }),
    }
  )
);
