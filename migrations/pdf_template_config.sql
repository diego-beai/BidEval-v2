-- ============================================
-- PDF Template Config: tabla global por organización
-- Ejecutar en Supabase SQL Editor
-- ============================================

-- Tabla de configuración de plantilla PDF
CREATE TABLE IF NOT EXISTS public.pdf_template_config (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  -- Para cuando se active multi-tenant (por ahora null = global)
  org_id uuid DEFAULT NULL,
  company_name text DEFAULT '',
  logo_data_url text DEFAULT '',
  primary_color text DEFAULT '#0a2540',
  footer_text text DEFAULT '',
  show_page_numbers boolean DEFAULT true,
  updated_at timestamptz DEFAULT now()
);

-- Índice para cuando se active org_id
CREATE INDEX IF NOT EXISTS idx_pdf_template_config_org_id
  ON public.pdf_template_config (org_id);

-- Insertar fila global por defecto (ID fijo para upsert)
INSERT INTO public.pdf_template_config (id, company_name, logo_data_url, primary_color, footer_text, show_page_numbers)
VALUES ('00000000-0000-0000-0000-000000000001', '', '', '#0a2540', '', true)
ON CONFLICT (id) DO NOTHING;

-- Trigger para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION public.update_pdf_template_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_pdf_template_updated_at ON public.pdf_template_config;
CREATE TRIGGER trg_pdf_template_updated_at
  BEFORE UPDATE ON public.pdf_template_config
  FOR EACH ROW EXECUTE FUNCTION public.update_pdf_template_updated_at();
