# BidEval - RFQ Processing & Supplier Evaluation Platform

Sistema integral para el procesamiento automatizado de RFQs (Request for Quotations) y evaluación de propuestas de proveedores del sector energético EPC, utilizando IA y workflows de N8N.

## Arquitectura del Sistema

```
┌─────────────────────────────────────────────────────────────────────┐
│                         BIDEVAL ARCHITECTURE                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   ┌──────────────┐         ┌──────────────┐         ┌────────────┐ │
│   │   Frontend   │ ──────> │   N8N        │ ──────> │  Supabase  │ │
│   │   (React)    │ Webhook │   Workflows  │   SQL   │  (Postgres)│ │
│   │   Port 3002  │ <────── │   + Ollama   │ <────── │  + pgvector│ │
│   └──────────────┘         └──────────────┘         └────────────┘ │
│                                   │                                 │
│                                   v                                 │
│                            ┌──────────────┐                        │
│                            │   Ollama     │                        │
│                            │   (LLM/RAG)  │                        │
│                            │   Qwen3, etc │                        │
│                            └──────────────┘                        │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

## Caracteristicas Principales

### Frontend Dashboard
- **Drag & Drop Upload**: Carga de PDFs con procesamiento paralelo (hasta 7 archivos)
- **Multi-Proyecto**: Gestión de múltiples proyectos de evaluación
- **Tabla de Evaluación**: Comparativa de proveedores por requisito
- **Sistema de Scoring**: Ranking ponderado de proveedores
- **Q&A Audit**: Generación automática de preguntas técnicas
- **Chat IA**: Consultas en lenguaje natural sobre los datos
- **Export CSV**: Descarga de resultados

### Backend (N8N Workflows)
- **OCR Automático**: Extracción de texto de PDFs escaneados
- **Clasificación IA**: Detección automática de proveedor y tipo de evaluación
- **Análisis RAG**: Búsqueda semántica con embeddings vectoriales (4096 dim)
- **Scoring Inteligente**: Evaluación ponderada por categorías
- **Email Automation**: Envío de Q&A a proveedores via Gmail API

---

## Stack Tecnológico

### Frontend (`/front-rfq`)
| Tecnología | Versión | Uso |
|------------|---------|-----|
| React | 18.x | Framework UI |
| TypeScript | 5.x | Type safety |
| Vite | 5.4 | Build tool |
| Zustand | 5.x | State management |
| TanStack Table | 8.x | Tablas avanzadas |
| Recharts | 2.x | Visualizaciones |
| React Dropzone | 14.x | Upload de archivos |

### Backend (N8N)
| Tecnología | Uso |
|------------|-----|
| N8N | Orchestración de workflows |
| Ollama | LLM local (Qwen3, Mistral) |
| Supabase | Base de datos PostgreSQL |
| pgvector | Embeddings vectoriales |
| Gmail API | Envío de emails |

---

## Flujos de N8N

### 1. `ingesta-rfqs.json` - Ingesta de Documentos RFQ
**Webhook:** `/webhook/ingesta-rfq`

**Función:** Procesa documentos RFQ base del cliente para extraer requisitos.

**Pipeline:**
1. Recibe PDF en Base64 via webhook
2. Convierte a binario y extrae texto (OCR si necesario)
3. Clasifica tipos de evaluación con IA (Mistral 7B):
   - Technical Evaluation
   - Economical Evaluation
   - Pre-FEED Deliverables
   - FEED Deliverables
4. Detecta nombre del proyecto
5. Extrae requisitos estructurados por fase
6. Almacena en `rfq_items_master`

**LLM Usado:** Mistral 7B (Ollama) para clasificación

---

### 2. `ingesta-ofertas.json` - Procesamiento de Propuestas
**Webhook:** `/webhook/ofertas-proveedores`

**Función:** Procesa propuestas de proveedores y las compara con requisitos RFQ.

**Pipeline:**
1. Recibe PDF de propuesta en Base64
2. Valida proveedor y tipo de evaluación con IA
3. Genera embeddings del documento (Qwen3-embedding:8b)
4. Almacena chunks en vectorstore `proposals`
5. Para cada requisito del RFQ:
   - Busca contexto relevante via RAG
   - Evalúa cumplimiento con LLM (Mistral Large)
   - Asigna score (0-10) y clasificación (INCLUIDO/PARCIAL/NO INCLUIDO)
6. Guarda evaluaciones en `provider_responses`

**LLMs Usados:**
- Qwen3-embedding:8b (embeddings)
- Mistral Large (evaluación)
- Mistral 7B (validación)

---

### 3. `scoring.json` - Evaluación y Ranking de Proveedores
**Webhook:** `/webhook/scoring-evaluation`

**Función:** Calcula puntuaciones ponderadas y genera ranking de proveedores.

**Pipeline:**
1. Obtiene requisitos y respuestas del proyecto
2. Agrupa por proveedor
3. Calcula scores por criterio:

| Categoría | Peso | Criterios |
|-----------|------|-----------|
| **Technical** | 30% | scope_facilities (10%), scope_work (10%), deliverables_quality (10%) |
| **Economic** | 35% | total_price (15%), price_breakdown (8%), optionals (7%), capex_opex (5%) |
| **Execution** | 20% | schedule (8%), resources (6%), exceptions (6%) |
| **HSE & Compliance** | 15% | safety_studies (8%), regulatory (7%) |

4. Genera evaluación con LLM (fortalezas, debilidades)
5. Almacena en `ranking_proveedores`

---

### 4. `chat.json` - Agente de Chat IA
**Webhook:** `/webhook/chat-rfq`

**Función:** Chatbot para consultas sobre proyectos RFQ en lenguaje natural.

**Herramientas disponibles:**
| Herramienta | Tipo | Descripción |
|-------------|------|-------------|
| `consultar_ofertas_proveedores` | Vector Search | Busca en documentos de propuestas |
| `consultar_documentos_rfq` | Vector Search | Busca en documentos RFQ originales |
| `query_requirements` | SQL | Consulta requisitos y respuestas |
| `query_provider_responses` | SQL | Consulta evaluaciones por proveedor |
| `query_ranking` | SQL | Obtiene ranking de proveedores |
| `query_qa_audit` | SQL | Consulta preguntas Q&A pendientes |

**LLM Usado:** Qwen3:8b con memoria PostgreSQL

---

### 5. `q&a.json` - Generación de Auditoría Técnica
**Webhook:** `/webhook/qa-audit-generator`

**Función:** Genera preguntas técnicas para items faltantes o parciales.

**Pipeline:**
1. Obtiene items no incluidos/parciales del proveedor
2. Agrupa deficiencias con requisitos originales
3. Genera preguntas técnicas con IA, clasificadas por:
   - **Disciplina:** Electrical, Mechanical, Civil, Process, General
   - **Importancia:** High, Medium, Low
4. Vincula cada pregunta al `requirement_id` original
5. Almacena en `qa_audit`

---

### 6. `qa-send-to-supplier.json` - Envío de Q&A a Proveedores
**Webhook:** `/webhook/qa-send-to-supplier`

**Función:** Genera tokens de acceso y envía emails con enlaces de respuesta.

**Pipeline:**
1. Genera token único de 64 caracteres
2. Almacena token con fecha de expiración en `qa_response_tokens`
3. Actualiza estado de preguntas a "Sent"
4. Genera HTML del email con preguntas
5. Envía via Gmail API

---

### 7. `mail.json` - Composición de Emails
**Webhook:** `/webhook/mail`

**Función:** Genera emails profesionales basados en issues detectados.

**Pipeline:**
1. Filtra items faltantes del proveedor
2. Combina con preguntas Q&A seleccionadas
3. Genera contenido del email con LLM
4. Aplica tono seleccionado (formal, amigable, urgente)

---

### 8. `qa-process-responses.json` - Procesamiento de Respuestas
**Webhook:** `/webhook/qa-process-responses`

**Función:** Procesa respuestas de proveedores y mapea a preguntas originales.

---

### 9. `Workflow-completo.json` - Workflow Principal
**Webhook:** `/webhook/tabla`

**Función:** Workflow principal que integra todas las funcionalidades para la vista de tabla comparativa.

---

## Estructura del Proyecto

```
BidEval-dock/
├── front-rfq/                    # Frontend React
│   ├── src/
│   │   ├── components/           # Componentes React
│   │   │   ├── charts/          # Gráficos de scoring
│   │   │   ├── chat/            # Interfaz de chat IA
│   │   │   ├── dashboard/       # Dashboard principal
│   │   │   ├── layout/          # Header, Footer, Layout
│   │   │   ├── mail/            # Composición de emails
│   │   │   ├── processing/      # Estados de procesamiento
│   │   │   ├── results/         # Tablas de resultados
│   │   │   └── upload/          # Upload de archivos
│   │   ├── config/
│   │   │   └── constants.ts     # Configuración API
│   │   ├── services/
│   │   │   ├── api.service.ts   # Fetch con retry
│   │   │   ├── n8n.service.ts   # Integración N8N
│   │   │   └── chat.service.ts  # Servicio de chat
│   │   ├── stores/              # Zustand stores (14)
│   │   ├── types/               # TypeScript types
│   │   └── utils/               # Utilidades
│   ├── package.json
│   ├── vite.config.ts
│   ├── .env.example
│   └── .env.local               # Variables de entorno
│
├── workflow n8n/                 # Flujos N8N (JSON)
│   ├── ingesta-rfqs.json        # Ingesta RFQ
│   ├── ingesta-ofertas.json     # Ingesta propuestas
│   ├── scoring.json             # Scoring proveedores
│   ├── chat.json                # Chat IA
│   ├── q&a.json                 # Generación Q&A
│   ├── qa-send-to-supplier.json # Envío Q&A
│   ├── mail.json                # Composición emails
│   └── Workflow-completo.json   # Workflow principal
│
├── bbdd.sql                      # Schema de base de datos
├── docker-compose.yml            # Orquestación Docker
├── Dockerfile                    # Build frontend
└── .dockerignore
```

---

## Instalación y Configuración

### Requisitos Previos
- Docker & Docker Compose
- Node.js >= 18.x (solo desarrollo)
- Instancia de N8N con Ollama
- Cuenta Supabase

### Opción 1: Docker (Recomendado)

```bash
# 1. Clonar repositorio
git clone https://github.com/tu-usuario/BidEval-dock.git
cd BidEval-dock

# 2. Configurar variables de entorno
cp front-rfq/.env.example front-rfq/.env.local
# Editar .env.local con tus credenciales

# 3. Levantar servicios
docker-compose up -d

# 4. Acceder a la aplicación
# Frontend: http://localhost:3002
```

### Opción 2: Desarrollo Local

```bash
# 1. Instalar dependencias
cd front-rfq
npm install

# 2. Configurar variables de entorno
cp .env.example .env.local
# Editar .env.local

# 3. Iniciar servidor de desarrollo
npm run dev
```

### Configuración de N8N

1. Importar workflows desde `/workflow n8n/` en tu instancia N8N
2. Configurar credenciales:
   - Supabase API
   - Ollama (local o remoto)
   - Gmail API (para emails)
3. Activar workflows

### Configuración de Base de Datos

Ejecutar el script `bbdd.sql` en tu instancia Supabase para crear:
- Tablas principales
- Vistas de ranking
- Funciones helper
- Índices optimizados

---

## Variables de Entorno

```env
# Supabase
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu_clave_anonima

# N8N Webhooks
VITE_N8N_WEBHOOK_URL=https://n8n.tudominio.com/webhook/tabla
```

---

## Proveedores Soportados

| Proveedor | Código | Color UI |
|-----------|--------|----------|
| Técnicas Reunidas | TR, TECNICASREUNIDAS | Teal |
| IDOM | IDOM | Green |
| SACYR | SACYR | Purple |
| Empresarios Agrupados | EA | Orange |
| SENER | SENER | Pink |
| TRESCA | TRESCA | Cyan |
| WORLEY | WORLEY | Amber |

---

## Tipos de Evaluación

| Tipo | Peso | Descripción |
|------|------|-------------|
| Technical Evaluation | 40% | Cumplimiento técnico del scope |
| Economical Evaluation | 30% | Análisis de precios y costos |
| Pre-FEED Deliverables | 15% | Entregables fase conceptual |
| FEED Deliverables | 15% | Entregables fase básica |

---

## API de Webhooks

### Subir Archivo
```http
POST /webhook/tabla
Content-Type: application/json

{
  "file_id": "rfq-1234567890",
  "file_title": "propuesta_idom.pdf",
  "file_binary": "<base64>",
  "project_id": "uuid",
  "proveedor": "IDOM",
  "evaluation": "Technical Evaluation"
}
```

### Generar Scoring
```http
POST /webhook/scoring-evaluation
Content-Type: application/json

{
  "project_id": "uuid",
  "provider_filter": "IDOM"  // opcional
}
```

### Chat
```http
POST /webhook/chat-rfq
Content-Type: application/json

{
  "chatInput": "Which provider has the highest technical score?",
  "sessionId": "session-uuid"
}
```

---

## Scripts Disponibles

```bash
# Desarrollo
npm run dev          # Servidor de desarrollo (port 3002)
npm run build        # Build de producción
npm run preview      # Preview del build
npm run lint         # Linter

# Docker
docker-compose up -d         # Levantar servicios
docker-compose down          # Detener servicios
docker-compose logs -f       # Ver logs
docker-compose build         # Rebuild imágenes
```

---

## Troubleshooting

### Error: "Request timeout"
- Aumentar timeout en `constants.ts` (default: 30 min)
- Verificar que N8N esté corriendo
- Revisar logs de Ollama

### Error: "No se recibieron resultados"
- Verificar workflows activos en N8N
- Comprobar URLs de webhooks
- Revisar credenciales de Supabase

### Error CORS en desarrollo
- Verificar configuración de proxy en `vite.config.ts`
- Asegurar que N8N permite el origen

---

## Licencia

Proyecto privado y confidencial - BEAI Energy
