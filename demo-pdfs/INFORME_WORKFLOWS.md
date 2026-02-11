# Informe de Workflows n8n - BidEval v2

**Fecha:** 2026-02-10 (actualizado)

## Resumen Ejecutivo

El sistema BidEval v2 utiliza un workflow n8n monolitico (`Workflow-completo.json`, ~7500 lineas) con 9+ sub-workflows interconectados. El flujo principal procesa documentos RFQ base y ofertas de proveedores, genera evaluaciones con IA, y produce un scoring ponderado final. Se han identificado gaps en el mapeo de tipos de evaluacion frontend-backend y discrepancias en pesos de scoring documentados vs implementados. Los PDFs demo generados (19 documentos) estan alineados con la estructura esperada por el workflow.

---

## 1. Flujo Actual de Procesamiento (Paso a Paso)

### 1.1 Ingesta de RFQ Base (`/webhook/ingesta-rfq`)

Pipeline que procesa el documento base del cliente (los requisitos de la licitacion):

```
1. Webhook RFQ -> Recibe PDF + metadata (project_id)
2. Generate IDs1 -> Genera identificadores unicos
3. Delete Old Doc Rows1 -> Limpia datos previos del mismo documento
4. Base64 a Binary3 -> Convierte archivo a binario
5. Extract from File3 -> Extrae texto del PDF
6. Preparar Texto1 -> Normaliza y prepara el texto
7. [En paralelo]:
   a. Insert Document Metadata2 -> Guarda metadata del documento
   b. Insert into Supabase Vectorstore1 -> Genera embeddings (Ollama qwen3-embedding:8b) y almacena
8. Clasificador de Tipos1 -> IA clasifica el documento en tipos de evaluacion:
   - Technical Evaluation
   - Economical Evaluation
   - Pre-FEED Deliverables
   - FEED Deliverables
9. Expandir por Tipo1 -> Crea un item por cada tipo detectado
10. Loop por Tipo1 -> Itera sobre cada tipo
11. Dividir en Trozos1 -> Divide el texto en chunks manejables
12-17. [Procesamiento de chunks con LLM Extractor por tipo]
18. Resumen Final1 -> Genera resumen consolidado
19. Respond Success1 -> Responde al frontend
```

**Modelos IA utilizados:** Mistral (mistral-large-latest) para clasificacion y extraccion.

### 1.2 Procesamiento de Ofertas (`/webhook/ofertas`)

Pipeline que procesa las propuestas de los proveedores:

```
1. Webhook -> Recibe PDF + metadata (project_id, provider, tipoEvaluacion[])
2-6. [Preparacion y OCR]
7-9. [Validacion y modo VALIDADOR/CLASIFICADOR]
10-19. [Evaluacion contra requisitos del mismo tipo]
20-22. [Almacenamiento en vectorstore y metadata]
23. Respond to Webhook -> Responde al frontend

RAMA PARALELA (Economica):
  Check If Economic Offer -> Extract Economic Data (Mistral Large, temp=0.1)
  -> Parse Economic JSON -> Save Economic Offer (UPSERT en economic_offers)
```

### 1.3 Scoring y Ranking (`/webhook/scoring-evaluation`)

```
1. Webhook Scoring -> Recibe project_id
2. Delete rankings previos
3-4. [Fetch requirements, responses, scoring config en paralelo]
5-9. [Merge, scoring LLM por proveedor, ponderacion]
10-14. [Insert/update rankings, generar ranking final]
```

### 1.4 Otros Sub-workflows

| Webhook | Funcion |
|---------|---------|
| `/webhook/mail` | Genera borradores de email sobre items faltantes |
| `/webhook/qa-audit-generator` | Genera preguntas tecnicas de auditoria |
| `/webhook/qa-send-to-supplier` | Genera tokens unicos y links de respuesta |
| `/webhook/qa-send-email` | Envia emails de Q&A via Gmail |
| `/webhook/qa-process-responses` | Procesa respuestas con re-evaluacion LLM |
| `/webhook/chat-rfq` | Agente de chat RAG con busqueda vectorial y SQL |

---

## 2. Correspondencia PDFs Demo <-> Workflows

### 2.1 PDFs Demo Generados (19 documentos)

| Tipo PDF | Documentos | Paginas | Workflow Destino |
|----------|-----------|---------|-----------------|
| RFP Tecnica | 1 (01_RFP_Tecnica.pdf) | 12 | `/webhook/ingesta-rfq` -> tipo "Technical Evaluation" |
| RFP Economica | 1 (02_RFP_Economica.pdf) | 11 | `/webhook/ingesta-rfq` -> tipo "Economical Evaluation" |
| RFP Compliance | 1 (03_RFP_Compliance.pdf) | 9 | `/webhook/ingesta-rfq` -> tipo "Technical Evaluation"* |
| Ofertas Tecnicas | 4 (1 por proveedor) | 14 c/u | `/webhook/ofertas` -> tipo "Technical Evaluation" |
| Ofertas Economicas | 4 (1 por proveedor) | 12 c/u | `/webhook/ofertas` -> tipo "Economical Evaluation" + rama economica |
| Ofertas Compliance | 4 (1 por proveedor) | 8 c/u | `/webhook/ofertas` -> tipo "Technical Evaluation"* o "Others" |
| Anexos | 4 (1 por proveedor) | 9-10 c/u | Documentacion complementaria |

*Nota: No existe tipo "Compliance" en el clasificador del backend. Los documentos de compliance se procesarian como "Technical Evaluation" o quedarian sin evaluar si se etiquetan como "Others".

### 2.2 Proveedores en los PDFs

| ID | Nombre | Perfil | CAPEX |
|----|--------|--------|-------|
| Supplier_01 | TechnoEngineering Solutions S.L. | Lider tecnico, precio medio-alto | 14.500.000 EUR |
| Supplier_02 | Iberia Industrial Projects S.A. | Equilibrada, buena relacion calidad-precio | 13.000.000 EUR |
| Supplier_03 | Global Process Engineering Ltd | Precio agresivo, compliance debil | 11.350.000 EUR |
| Supplier_04 | MediterraneanEPC Group S.L. | Excelente HSE, precio premium | 15.700.000 EUR |

### 2.3 Contenido Optimizado para Extraccion IA

Los PDFs demo estan estructurados para facilitar la extraccion automatica:

| Contenido PDF | Campo/Tabla Destino | Calidad Extraccion Esperada |
|--------------|--------------------|-----------------------------|
| Tablas CAPEX con headers claros | `economic_offers.price_breakdown` | Alta (tablas bien formateadas) |
| Tablas OPEX con subtotales | `economic_offers.tco_breakdown` | Alta |
| Cronogramas en tabla | `provider_responses` (schedule) | Alta |
| Equipos de proyecto en tabla | `provider_responses` (resources) | Alta |
| Indicadores HSE en tabla | `provider_responses` (safety) | Alta |
| Rate Card con EUR/h | Pendiente campo DB | Media-Alta |
| Texto de condiciones comerciales | `economic_offers.payment_terms/guarantees` | Media |
| Excepciones y desviaciones | `provider_responses` (exceptions) | Media |

---

## 3. Separacion por Disciplina: Technical / Economic / Compliance

### Estado actual

| Aspecto | Technical | Economic | Compliance/HSE |
|---------|-----------|----------|----------------|
| Clasificacion RFQ (backend) | Technical Evaluation | Economical Evaluation | **No existe como tipo separado** |
| Tipo en frontend (ofertas) | Technical Evaluation | Economical Evaluation | Solo "Others" |
| Items en rfq_items_master | evaluation_type = "Technical" | evaluation_type = "Economical" | Mezclado en "Technical" |
| Scoring (categorias) | TECHNICAL (30%) | ECONOMIC (35%) | HSE_COMPLIANCE (15%) |
| **PDFs demo disponibles** | **SI (14 pags c/u)** | **SI (12 pags c/u)** | **SI (8 pags c/u)** |

---

## 4. Scoring Ponderado por Disciplina

### Configuracion actual (scoring.types.ts)

```
TECHNICAL (30%):
  - scope_facilities: 33.33% de categoria (10% absoluto)
  - scope_work: 33.33% (10%)
  - deliverables_quality: 33.34% (10%)

ECONOMIC (35%):
  - total_price: 42.86% (15%)
  - price_breakdown: 22.86% (8%)
  - optionals: 20.00% (7%)
  - capex_opex: 14.28% (5%)

EXECUTION (20%):
  - schedule: 40% (8%)
  - resources: 30% (6%)
  - exceptions: 30% (6%)

HSE_COMPLIANCE (15%):
  - safety: 53.33% (8%)
  - regulatory: 46.67% (7%)
```

### Datos disponibles en PDFs demo para cada criterio

| Criterio | Datos en Oferta Tecnica | Datos en Oferta Economica | Datos en Oferta Compliance |
|----------|------------------------|--------------------------|---------------------------|
| scope_facilities | SI: Seccion 3 (unidades proceso) | - | - |
| scope_work | SI: Seccion 2 (metodologia) | - | - |
| deliverables_quality | SI: Seccion 9 (lista entregables) | - | - |
| total_price | - | SI: Seccion 2 (tablas CAPEX) | - |
| price_breakdown | - | SI: Seccion 2 (detalle A.1-A.4) | - |
| optionals | - | SI: Seccion 5.4 (descuentos) | - |
| capex_opex | - | SI: Secciones 2+3+5 | - |
| schedule | SI: Seccion 2.1 (cronograma) | - | - |
| resources | SI: Seccion 4 (equipo proyecto) | SI: Seccion 4 (rate card) | - |
| exceptions | SI: Seccion 11 (excepciones) | SI: Seccion 5.5 (exclusiones) | - |
| safety | - | - | SI: Secciones 1-4 (HSE plan, indicadores) |
| regulatory | - | - | SI: Secciones 6-8 (compliance, formacion) |

---

## 5. Gaps y Problemas Identificados

### GAP 1: Desalineacion Frontend vs. Backend en Tipos de Evaluacion (CRITICO)

| Frontend (MultiFileMetadataModal) | Backend (Clasificador) |
|-----------------------------------|------------------------|
| Technical Evaluation | Technical Evaluation |
| Economical Evaluation | Economical Evaluation |
| **Others** | **Pre-FEED Deliverables** |
| *(no existe)* | **FEED Deliverables** |

**Impacto en demo:** Las ofertas de Compliance (8 paginas cada una) no tienen tipo adecuado. Si se suben como "Others", no se evaluaran contra ningun requisito.

**Recomendacion:** Para la demo, subir las Ofertas Compliance como "Technical Evaluation" y dejar que la IA evalue los aspectos HSE dentro de los criterios safety/regulatory.

### GAP 2: Discrepancia en Pesos de Scoring Documentados vs Codigo (MEDIO)

| Categoria | SCORING_WORKFLOW.md | scoring.types.ts |
|-----------|---------------------|------------------|
| TECHNICAL | **40%** | **30%** |
| ECONOMIC | **30%** | **35%** |
| EXECUTION | **20%** | **20%** |
| HSE/ESG | **10%** | **15%** |

La documentacion no refleja los pesos reales del codigo.

### GAP 3: Scoring Economico No Usa Datos Cuantitativos (CRITICO)

El workflow de scoring evalua con LLM usando scores cualitativos 0-10, pero **no consulta la tabla `economic_offers`** donde estan los precios reales. Esto puede generar inconsistencias visibles en la demo.

### GAP 4: Workflow Monolitico (~7500 lineas) (BAJO)

Dificulta debugging y versionado pero no afecta la demo.

---

## 6. Recomendaciones

### Para la Demo (P0)

1. **Subir PDFs como "Technical Evaluation" + "Economical Evaluation"** (evitar "Others")
2. **Pre-cargar datos:** Tener un proyecto ya evaluado como fallback
3. **Flujo sugerido:** RFP Tecnica -> RFP Economica -> 2-3 Ofertas Tecnicas -> 2-3 Ofertas Economicas -> Scoring -> Dashboard
4. **Mostrar:** Spider chart, tabla ranking, seccion economica con comparacion CAPEX/OPEX
5. **Usar scoring dinamico:** Conectar la matriz de evaluacion del wizard con `scoring_configuration_summary`

### Post-demo (P1)

6. Alinear tipos frontend-backend (anadir "Pre-FEED/FEED Deliverables" o "Compliance/HSE")
7. Sincronizar documentacion de pesos
8. Implementar scoring cuantitativo para precio (formula inversa)

### Futuro (P2)

9. Separar workflow monolitico en sub-workflows independientes
10. Anadir tipo "Compliance" al clasificador
11. Integrar `economic_offers` con el workflow de scoring

---

## Anexo: Modelos de IA Utilizados

| Modelo | Uso |
|--------|-----|
| Mistral Large (mistral-large-latest) | Clasificacion RFQ, extraccion items, evaluacion ofertas, extraccion economica |
| Mistral 7B (mistral:7b via Ollama) | Chat RAG agent |
| Qwen3 8B (qwen3:8b via Ollama) | Scoring LLM Chain |
| Qwen3 Embedding 8B | Generacion de embeddings vectoriales (4096d) |
| OpenRouter | Procesamiento de respuestas de email |

---

*Informe actualizado el 2026-02-10. Basado en analisis de Workflow-completo.json (~7500 lineas), codigo frontend, y PDFs demo regenerados (19 documentos, 211 KB total).*
