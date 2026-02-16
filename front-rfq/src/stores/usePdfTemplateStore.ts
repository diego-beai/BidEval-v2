import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface PdfTemplateConfig {
  companyName: string;
  logoDataUrl: string;
  primaryColor: string;
  footerText: string;
  showPageNumbers: boolean;
}

interface PdfTemplateStore extends PdfTemplateConfig {
  updateConfig: (partial: Partial<PdfTemplateConfig>) => void;
  resetConfig: () => void;
  setLogo: (dataUrl: string) => void;
}

const DEFAULT_CONFIG: PdfTemplateConfig = {
  companyName: '',
  logoDataUrl: '',
  primaryColor: '#0a2540',
  footerText: '',
  showPageNumbers: true,
};

export const usePdfTemplateStore = create<PdfTemplateStore>()(
  persist(
    (set) => ({
      ...DEFAULT_CONFIG,
      updateConfig: (partial) => set((state) => ({ ...state, ...partial })),
      resetConfig: () => set(DEFAULT_CONFIG),
      setLogo: (dataUrl) => set({ logoDataUrl: dataUrl }),
    }),
    {
      name: 'bideval-pdf-template',
    }
  )
);
