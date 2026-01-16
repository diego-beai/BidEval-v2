# RFQ Processor - Frontend

Frontend web para el procesamiento automático de RFQs (Request for Quotations) con análisis de múltiples proveedores utilizando el workflow de n8n con IA.

## 🚀 Características

- **Drag & Drop**: Interfaz intuitiva para cargar archivos PDF
- **Procesamiento Inteligente**: Integración con workflow n8n que incluye:
  - OCR automático para PDFs escaneados
  - Clasificación de proveedores con IA
  - Detección de tipos de evaluación
  - Análisis de ítems con LLM
- **Visualización de Resultados**: Tabla dinámica con evaluaciones por proveedor
- **Exportación**: Descarga de resultados en formato CSV
- **Diseño Profesional**: Interfaz oscura moderna con gradientes y animaciones

## 🛠️ Stack Tecnológico

- **React 18** - Framework UI
- **TypeScript** - Type safety
- **Vite** - Build tool y dev server
- **Zustand** - State management
- **TanStack Table** - Tablas avanzadas
- **React Dropzone** - Upload de archivos
- **CSS Custom Properties** - Sistema de diseño consistente

## 📋 Requisitos Previos

- Node.js >= 18.x
- npm >= 9.x
- n8n workflow activo y accesible

## 🔧 Instalación

1. **Instalar dependencias**:
   ```bash
   npm install
   ```

2. **Configurar variables de entorno**:
   Copia el archivo `.env.example` a `.env.local` y ajusta la URL del webhook:
   ```bash
   cp .env.example .env.local
   ```

   Edita `.env.local`:
   ```env
   VITE_N8N_WEBHOOK_URL=http://localhost:5678/webhook-test/rfq
   ```

3. **Configurar Base de Datos**:
   Copia y ejecuta el siguiente script SQL en el editor de Supabase para generar la estructura completa:

   ```sql
   -- 0. TABLA DE PROYECTOS (Normalización de nombres)
   CREATE TABLE IF NOT EXISTS public.projects (
       id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
       name TEXT NOT NULL UNIQUE, -- Nombre normalizado (sin caracteres especiales, mayúsculas)
       display_name TEXT NOT NULL, -- Nombre para mostrar (puede tener caracteres especiales)
       description TEXT,
       created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
       updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
   );

   -- Índice para búsquedas rápidas por nombre
   CREATE INDEX IF NOT EXISTS idx_projects_name ON public.projects(name);
   CREATE INDEX IF NOT EXISTS idx_projects_display_name ON public.projects(display_name);

   -- 1. REGISTRO GLOBAL DE DOCUMENTOS
   CREATE TABLE IF NOT EXISTS public.document_metadata (
       id TEXT PRIMARY KEY,
       title TEXT,
       project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
       document_type TEXT NOT NULL,
       provider TEXT,
       evaluation_types TEXT[],
       created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
   );

   -- 2. TABLAS VECTORIALES (Vectores de 4096)
   -- Aceptan los 4096 de Qwen3, solo que no llevan índice (perfecto para <10k filas)
   CREATE TABLE IF NOT EXISTS public.rfq (
       id BIGSERIAL PRIMARY KEY,
       content TEXT,
       metadata JSONB,
       embedding vector(4096) 
   );

   CREATE TABLE IF NOT EXISTS public.proposals (
       id BIGSERIAL PRIMARY KEY,
       content TEXT,
       metadata JSONB,
       embedding vector(4096)
   );

   -- 3. REQUISITOS MAESTROS
   CREATE TABLE IF NOT EXISTS public.rfq_items_master (
       id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
       file_id TEXT REFERENCES public.document_metadata(id) ON DELETE CASCADE,
       project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
       evaluation_type TEXT NOT NULL,
       phase TEXT,
       requirement_text TEXT NOT NULL,
       created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
   );

   -- Índice para búsquedas por proyecto
   CREATE INDEX IF NOT EXISTS idx_rfq_items_master_project_id ON public.rfq_items_master(project_id);

   -- 4. EVALUACIONES DE PROVEEDORES
   CREATE TABLE IF NOT EXISTS public.provider_responses (
       id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
       requirement_id UUID REFERENCES public.rfq_items_master(id) ON DELETE CASCADE,
       provider_name TEXT NOT NULL,
       evaluation_value TEXT,
       score INTEGER, -- Added score column for quantitative evaluation
       comment TEXT,
       file_id TEXT REFERENCES public.document_metadata(id) ON DELETE CASCADE,
       updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
       CONSTRAINT unique_requirement_provider UNIQUE(requirement_id, provider_name)
   );

   -- 5. AUDITORÍA TÉCNICA (Q&A)
   CREATE TABLE IF NOT EXISTS public.qa_audit (
       id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
       requirement_id UUID REFERENCES public.rfq_items_master(id) ON DELETE SET NULL,
       project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
       provider_name TEXT NOT NULL,
       discipline TEXT,
       question TEXT NOT NULL,
       importance TEXT CHECK (importance IN ('High', 'Medium', 'Low')),
       status TEXT DEFAULT 'Pending',
       response TEXT,
       created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
   );

   -- Índice para búsquedas por proyecto
   CREATE INDEX IF NOT EXISTS idx_qa_audit_project_id ON public.qa_audit(project_id);

   -- 6. TABLA QA_PENDIENTE (compatibilidad con el frontend)
   -- Esta tabla mantiene la estructura esperada por el frontend
   CREATE TABLE IF NOT EXISTS public.QA_PENDIENTE (
       id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
       created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
       project_id TEXT NOT NULL, -- Mantenemos TEXT para compatibilidad, pero debería referenciar projects
       proveedor TEXT NOT NULL,
       disciplina TEXT CHECK (disciplina IN ('Eléctrica', 'Mecánica', 'Civil', 'Proceso', 'General')),
       pregunta_texto TEXT NOT NULL,
       estado TEXT CHECK (estado IN ('Borrador', 'Pendiente', 'Aprobada', 'Enviada', 'Respondida', 'Descartada')) DEFAULT 'Borrador',
       importancia TEXT CHECK (importancia IN ('Alta', 'Media', 'Baja')),
       respuesta_proveedor TEXT,
       fecha_respuesta TIMESTAMP WITH TIME ZONE,
       notas_internas TEXT
   );

   -- Índices para QA_PENDIENTE
   CREATE INDEX IF NOT EXISTS idx_qa_pendiente_project_id ON public.QA_PENDIENTE(project_id);
   CREATE INDEX IF NOT EXISTS idx_qa_pendiente_proveedor ON public.QA_PENDIENTE(proveedor);
   CREATE INDEX IF NOT EXISTS idx_qa_pendiente_estado ON public.QA_PENDIENTE(estado);

   -- Función para actualizar updated_at en projects
   CREATE OR REPLACE FUNCTION update_projects_updated_at()
   RETURNS TRIGGER AS $$
   BEGIN
       NEW.updated_at = NOW();
       RETURN NEW;
   END;
   $$ LANGUAGE plpgsql;

   -- Trigger para actualizar updated_at automáticamente
   CREATE TRIGGER trigger_update_projects_updated_at
       BEFORE UPDATE ON public.projects
       FOR EACH ROW
       EXECUTE FUNCTION update_projects_updated_at();

   -- Función helper para normalizar nombres de proyectos
   -- Convierte nombres con caracteres especiales a formato normalizado
   CREATE OR REPLACE FUNCTION normalize_project_name(display_name TEXT)
   RETURNS TEXT AS $$
   BEGIN
       RETURN UPPER(
           REGEXP_REPLACE(
               REGEXP_REPLACE(display_name, '[^\w\s]', '', 'g'), -- Elimina caracteres especiales
               '\s+', '_', 'g' -- Reemplaza espacios múltiples con guión bajo
           )
       );
   END;
   $$ LANGUAGE plpgsql IMMUTABLE;

   -- Función para obtener o crear un proyecto
   -- Útil para migraciones y para asegurar que los proyectos se crean correctamente
   CREATE OR REPLACE FUNCTION get_or_create_project(
       p_display_name TEXT,
       p_description TEXT DEFAULT NULL
   )
   RETURNS UUID AS $$
   DECLARE
       v_project_id UUID;
       v_normalized_name TEXT;
   BEGIN
       -- Normalizar el nombre
       v_normalized_name := normalize_project_name(p_display_name);
       
       -- Buscar si ya existe
       SELECT id INTO v_project_id
       FROM public.projects
       WHERE name = v_normalized_name OR display_name = p_display_name
       LIMIT 1;
       
       -- Si no existe, crearlo
       IF v_project_id IS NULL THEN
           INSERT INTO public.projects (name, display_name, description)
           VALUES (v_normalized_name, p_display_name, p_description)
           RETURNING id INTO v_project_id;
       END IF;
       
       RETURN v_project_id;
   END;
   $$ LANGUAGE plpgsql;

   -- Vista para facilitar consultas con nombres de proyectos
   CREATE OR REPLACE VIEW v_projects_with_stats AS
   SELECT 
       p.id,
       p.name,
       p.display_name,
       p.description,
       p.created_at,
       p.updated_at,
       COUNT(DISTINCT dm.id) as document_count,
       COUNT(DISTINCT rim.id) as requirement_count,
       COUNT(DISTINCT qa.id) as qa_count
   FROM public.projects p
   LEFT JOIN public.document_metadata dm ON dm.project_id = p.id
   LEFT JOIN public.rfq_items_master rim ON rim.project_id = p.id
   LEFT JOIN public.qa_audit qa ON qa.project_id = p.id
   GROUP BY p.id, p.name, p.display_name, p.description, p.created_at, p.updated_at;

   -- ============================================
   -- TABLA DE RANKING DE PROVEEDORES
   -- ============================================
   CREATE TABLE IF NOT EXISTS public.ranking_proveedores (
       id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
       provider_name TEXT NOT NULL,
       project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
       cumplimiento_porcentual DECIMAL(5,2) DEFAULT 0, -- Porcentaje de cumplimiento (0-100)
       technical_score DECIMAL(3,1) DEFAULT 0, -- Puntaje técnico (0-10)
       economical_score DECIMAL(3,1) DEFAULT 0, -- Puntaje económico (0-10)
       pre_feed_score DECIMAL(3,1) DEFAULT 0, -- Puntaje Pre-FEED (0-10)
       feed_score DECIMAL(3,1) DEFAULT 0, -- Puntaje FEED (0-10)
       overall_score DECIMAL(3,1) DEFAULT 0, -- Puntaje general (0-10)
       evaluation_count INTEGER DEFAULT 0, -- Número de evaluaciones realizadas
       last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
       created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
   );

   -- Índices para mejor rendimiento
   CREATE INDEX IF NOT EXISTS idx_ranking_provider_name ON public.ranking_proveedores(provider_name);
   CREATE INDEX IF NOT EXISTS idx_ranking_project_id ON public.ranking_proveedores(project_id);
   CREATE INDEX IF NOT EXISTS idx_ranking_cumplimiento ON public.ranking_proveedores(cumplimiento_porcentual);

   -- Función para actualizar automáticamente overall_score
   CREATE OR REPLACE FUNCTION update_overall_score()
   RETURNS TRIGGER AS $$
   BEGIN
       NEW.overall_score = (
           COALESCE(NEW.technical_score, 0) +
           COALESCE(NEW.economical_score, 0) +
           COALESCE(NEW.pre_feed_score, 0) +
           COALESCE(NEW.feed_score, 0)
       ) / NULLIF(NEW.evaluation_count, 0);

       -- Si no hay evaluaciones, el score es 0
       IF NEW.evaluation_count = 0 THEN
           NEW.overall_score = 0;
       END IF;

       RETURN NEW;
   END;
   $$ LANGUAGE plpgsql;

   -- Trigger para actualizar overall_score automáticamente
   CREATE OR REPLACE TRIGGER trigger_update_overall_score
       BEFORE INSERT OR UPDATE ON public.ranking_proveedores
       FOR EACH ROW
       EXECUTE FUNCTION update_overall_score();

   -- ============================================
   -- VISTA: ranking_proveedores_por_tipo
   -- Vista que calcula scores por tipo de evaluación para cada proveedor
   -- Esta vista es usada por el frontend para mostrar gráficos de scoring
   -- ============================================
   CREATE OR REPLACE VIEW public.ranking_proveedores_por_tipo AS
   WITH provider_scores AS (
       SELECT
           r.provider_name,
           m.project_id,
           m.evaluation_type,
           COUNT(r.id) as items_evaluados,
           COALESCE(AVG(r.score), 0) as avg_score
       FROM provider_responses r
       JOIN rfq_items_master m ON r.requirement_id = m.id
       WHERE r.score IS NOT NULL
       GROUP BY r.provider_name, m.project_id, m.evaluation_type
   ),
   aggregated_scores AS (
       SELECT
           provider_name,
           project_id,
           -- Technical Evaluation score
           COALESCE(MAX(CASE WHEN evaluation_type ILIKE '%Technical%' THEN avg_score END), 0) as technical_score,
           -- Economical Evaluation score
           COALESCE(MAX(CASE WHEN evaluation_type ILIKE '%Econom%' THEN avg_score END), 0) as economical_score,
           -- Pre-FEED score
           COALESCE(MAX(CASE WHEN evaluation_type ILIKE '%Pre-FEED%' OR evaluation_type ILIKE '%Pre FEED%' THEN avg_score END), 0) as pre_feed_score,
           -- FEED score (excluding Pre-FEED)
           COALESCE(MAX(CASE WHEN evaluation_type ILIKE '%FEED%' AND evaluation_type NOT ILIKE '%Pre-FEED%' AND evaluation_type NOT ILIKE '%Pre FEED%' THEN avg_score END), 0) as feed_score,
           -- Total items evaluados
           SUM(items_evaluados) as total_items
       FROM provider_scores
       GROUP BY provider_name, project_id
   )
   SELECT
       provider_name,
       project_id,
       ROUND(technical_score::numeric, 2) as technical_score,
       ROUND(economical_score::numeric, 2) as economical_score,
       ROUND(pre_feed_score::numeric, 2) as pre_feed_score,
       ROUND(feed_score::numeric, 2) as feed_score,
       ROUND(((technical_score * 0.4 + economical_score * 0.3 + pre_feed_score * 0.15 + feed_score * 0.15))::numeric, 2) as overall_score,
       ROUND(((technical_score + economical_score + pre_feed_score + feed_score) / 4 * 10)::numeric, 2) as cumplimiento_porcentual,
       total_items as evaluation_count
   FROM aggregated_scores
   ORDER BY overall_score DESC;

   -- ============================================
   -- VISTA LEGACY: ranking_proveedores_simple (para compatibilidad)
   -- ============================================
   CREATE OR REPLACE VIEW public.ranking_proveedores_simple AS
   SELECT
     m.project_id,
     r.provider_name,
     count(r.id) as total_items_evaluados,
     sum(r.score) as puntos_totales,
     round(
       sum(r.score)::numeric / (NULLIF(count(r.id), 0) * 10)::numeric * 100::numeric,
       2
     ) as cumplimiento_porcentual
   FROM
     rfq_items_master m
     JOIN provider_responses r ON m.id = r.requirement_id
   GROUP BY
     m.project_id,
     r.provider_name
   ORDER BY cumplimiento_porcentual DESC;
   ```

4. **Iniciar servidor de desarrollo**:
   ```bash
   npm run dev
   ```

   La aplicación estará disponible en `http://localhost:3000`

## 🏗️ Build para Producción

```bash
npm run build
```

Los archivos optimizados se generarán en la carpeta `dist/`

Para previsualizar el build:
```bash
npm run preview
```

## 📁 Estructura del Proyecto

```
src/
├── components/          # Componentes React
│   ├── layout/         # Layout (Header, Footer, AppLayout)
│   ├── upload/         # Componentes de upload
│   ├── processing/     # Estado de procesamiento
│   ├── results/        # Tabla de resultados
│   └── ui/             # Componentes UI reutilizables
├── config/             # Configuración y constantes
├── hooks/              # Custom React hooks
├── services/           # Servicios de API
├── stores/             # Zustand stores
├── types/              # Definiciones TypeScript
├── utils/              # Utilidades (validators, formatters, etc)
├── App.tsx             # Componente principal
└── main.tsx            # Punto de entrada
```

## 🔌 Integración con n8n

### Configuración del Webhook

El frontend se comunica con n8n a través de un webhook POST que:

1. Recibe el archivo PDF
2. Procesa el documento (OCR si es necesario)
3. Clasifica el proveedor y tipo de evaluación
4. Evalúa los ítems de RFQ
5. Devuelve un array de resultados

### Datos Enviados al Webhook

⚠️ **IMPORTANTE**: El frontend ahora soporta **procesamiento paralelo de múltiples archivos** (hasta 7 archivos simultáneos).

Cada archivo se envía como una petición POST JSON independiente a `http://localhost:5678/webhook/rfq`:

```json
{
  "file_id": "rfq-1735478123456-abc123def",
  "file_title": "oferta_sacyr.pdf",
  "file_url": "",
  "file_binary": "JVBERi0xLjQKJcOkw7zDtsOfCjIgMCBvYmoKPDwvTGVuZ3RoIDMgMCB...",
  "metadata": {
    "uploadedAt": "2025-12-29T10:30:00.000Z",
    "fileName": "oferta_sacyr.pdf",
    "fileSize": 2048576,
    "fileId": "rfq-1735478123456-abc123def"
  }
}
```

**Campos:**
- `file_id`: ID único generado automáticamente
- `file_title`: Nombre del archivo original
- `file_url`: Vacío (se mantiene por compatibilidad)
- `file_binary`: Contenido del PDF en base64 **sin prefijo** `data:application/pdf;base64,`
- `metadata`: Información adicional del archivo

**Procesamiento Paralelo:**
Cuando el usuario selecciona múltiples archivos (2-7 PDFs):
1. El frontend envía **todas las peticiones en paralelo** usando `Promise.all()`
2. Cada archivo se procesa independientemente en n8n
3. El frontend espera a que **todas** terminen
4. Se muestra **solo la última respuesta** (que contiene todos los datos actualizados)

**Ejemplo de acceso en n8n:**
```javascript
// Webhook recibe JSON
$json.file_id        // "rfq-1735478123456-abc123def"
$json.file_title     // "oferta_sacyr.pdf"
$json.file_binary    // Base64 del PDF
$json.metadata.fileSize  // 2048576
```

### Formato de Respuesta Esperado
```json
[
  {
    "id": 1,
    "item": "Descripción del ítem",
    "fase": "FEED",
    "Evaluation": "Technical Evaluation",
    "TECNICASREUNIDAS": "INCLUIDO - Descripción | Ref: Pág 12",
    "IDOM": "NO COTIZADO",
    "SACYR": "45.000 EUR - Precio fijo | Ref: Tabla 3.2",
    ...
  }
]
```

### Proveedores Soportados

- **Técnicas Reunidas** (TR, TECNICASREUNIDAS)
- **IDOM**
- **SACYR**
- **Empresarios Agrupados** (EA)
- **SENER**
- **TRESCA**
- **WORLEY**

## 🎨 Personalización

### Colores y Tema

Los colores están definidos en `styles.css` usando CSS Custom Properties:

```css
:root {
  --bg0: #070a0c;
  --bg1: #0b1014;
  --card: rgba(14, 20, 26, 0.84);
  --text: #e8eef5;
  --muted: rgba(232, 238, 245, 0.70);
  --accent: #12b5b0;
  --danger: #ff5d5d;
  --ok: #41d17a;
}
```

Para cambiar los colores, modifica estos valores en `styles.css`.

### Configuración de API

Edita `src/config/constants.ts` para ajustar:
- Tamaño máximo de archivo
- Timeout de requests
- Tipos de archivo permitidos
- Nombres de proveedores


## 🐛 Troubleshooting

### Error: "Request timeout"
- El webhook de n8n está tardando más de 10 minutos
- Verifica que n8n esté corriendo
- Revisa la configuración de timeout en `constants.ts`

### Error: "No se recibieron resultados"
- Verifica que el workflow de n8n esté activo
- Comprueba que la URL del webhook sea correcta
- Revisa los logs de n8n para errores

### Archivo no se sube
- Verifica que sea un archivo PDF válido
- Comprueba que el tamaño sea menor a 50MB
- Revisa la consola del navegador para errores CORS

## 📝 Scripts Disponibles

- `npm run dev` - Inicia servidor de desarrollo
- `npm run build` - Genera build de producción
- `npm run preview` - Previsualiza build de producción
- `npm run lint` - Ejecuta linter de código

## 📄 Licencia

Este proyecto es privado y confidencial.


