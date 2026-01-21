# Scoring Workflow - Documentacion Completa

## Resumen

El sistema de scoring permite evaluar automaticamente a los proveedores basandose en sus respuestas a los requisitos del RFQ, utilizando IA para analizar la calidad de las respuestas y calcular puntuaciones ponderadas segun 12 criterios especificos.

---

## Arquitectura del Sistema

```
+------------------+     +------------------+     +------------------+
|   Frontend       |     |   n8n Workflow   |     |   Supabase       |
|   (React)        |<--->|   (scoring.json) |<--->|   (PostgreSQL)   |
+------------------+     +------------------+     +------------------+
        |                        |                        |
        v                        v                        v
  ScoringMatrix           Mistral LLM            ranking_proveedores
  useScoringStore         JSON Output            ranking_proveedores_por_tipo
```

---

## 1. Workflow de n8n (`scoring.json`)

### Ubicacion
`/workflow n8n/scoring.json`

### Flujo del Workflow

```
Webhook POST -> Set Params -> [Fetch Requirements + Fetch Responses]
    -> Merge -> Prepare Data -> Loop Providers -> LLM Scoring (Mistral)
    -> Calculate Weighted -> Upsert Ranking -> Aggregate -> Respond
```

### Nodos Principales

| Nodo | Descripcion |
|------|-------------|
| **Webhook Scoring** | Endpoint POST `/webhook/scoring-evaluation` |
| **Set Input Params** | Extrae `project_id`, `provider_name` (filtro opcional), `recalculate_all` |
| **Fetch Requirements** | Obtiene requisitos de `rfq_items_master` |
| **Fetch Provider Responses** | Obtiene respuestas de `provider_responses` |
| **Prepare Scoring Data** | Agrupa por categoria, mapea a criterios y asigna pesos |
| **Scoring LLM Chain** | Mistral evalua cada proveedor con los 12 criterios |
| **Calculate Weighted Scores** | Aplica ponderacion por criterio individual |
| **Upsert Ranking** | Guarda en `ranking_proveedores` |
| **Generate Final Ranking** | Ordena y genera ranking final |

---

## 2. Criterios de Evaluacion Detallados

El sistema utiliza **12 criterios especificos** organizados en 4 categorias principales:

### TECNICA (40% total)

| Criterio | Peso | Que Evaluar |
|----------|------|-------------|
| **Eficiencia del Sistema (BOP)** | 15% | Consumo total de energia (kWh/kg H2) incluyendo auxiliares |
| **Degradacion y Vida Util** | 10% | Horas garantizadas antes del reemplazo del stack y % de perdida anual |
| **Flexibilidad Operativa** | 10% | Carga minima (Turndown) y velocidad de respuesta a cambios (rampa) |
| **Pureza y Presion** | 5% | Calidad del gas de salida y presion directa sin necesidad de compresor extra |

### ECONOMICA (30% total)

| Criterio | Peso | Que Evaluar |
|----------|------|-------------|
| **CAPEX Total** | 15% | Precio de compra, transporte, seguros y puesta en marcha |
| **OPEX Garantizado** | 10% | Coste de mantenimiento, consumibles y repuestos por contrato |
| **Garantias y Penalizaciones** | 5% | Cobertura en caso de fallo y penalizaciones por falta de disponibilidad |

### EJECUCION (20% total)

| Criterio | Peso | Que Evaluar |
|----------|------|-------------|
| **Plazo de Entrega** | 10% | Semanas desde la firma hasta la entrega en sitio (Lead Time) |
| **Experiencia (Track Record)** | 5% | Numero de plantas similares instaladas y operando actualmente |
| **Solidez del Proveedor** | 5% | Capacidad financiera y red de servicio tecnico local/regional |

### HSE/ESG (10% total)

| Criterio | Peso | Que Evaluar |
|----------|------|-------------|
| **Seguridad y ATEX** | 5% | Certificaciones de seguridad y cumplimiento de normativa de explosivos |
| **Sostenibilidad** | 5% | Huella de carbono de la fabricacion y reciclabilidad de materiales |

---

## 3. Escala de Puntuacion del LLM

El LLM evalua cada criterio de 0-10:

| Score | Significado |
|-------|-------------|
| **10** | Excede requisitos significativamente, best-in-class |
| **8-9** | Totalmente conforme, cumple todos los requisitos excelentemente |
| **6-7** | Conforme con gaps menores o areas de mejora |
| **4-5** | Parcialmente conforme, gaps significativos identificados |
| **2-3** | Minimamente conforme, problemas mayores o informacion faltante |
| **0-1** | No conforme, no abordado, o sin respuesta |

### Interpretacion de Valores de Respuesta

| Valor en Respuesta | Rango de Score |
|--------------------|----------------|
| "INCLUIDO" / "SI" / Especificaciones detalladas | 7-10 |
| "PARCIAL" / Respuesta generica | 4-6 |
| "NO INCLUIDO" / "NO" | 0-3 |
| Vacio o null | 0 |

---

## 4. Endpoint API

```
POST https://n8n.beaienergy.com/webhook-test/scoring-evaluation
```

### Request Body

```json
{
  "project_id": "uuid-del-proyecto",
  "provider_name": "TR",           // opcional - filtrar un proveedor
  "recalculate_all": false         // opcional - recalcular todo
}
```

### Response Schema

```json
{
  "success": true,
  "ranking": [
    {
      "position": 1,
      "provider_name": "EA",
      "overall_score": 9.85,
      "compliance_percentage": 98.5,
      "detailed_scores": {
        "TECHNICAL": {
          "EFICIENCIA_SISTEMA_BOP": { "score": 9.5, "justification": "..." },
          "DEGRADACION_VIDA_UTIL": { "score": 9.0, "justification": "..." },
          "FLEXIBILIDAD_OPERATIVA": { "score": 9.8, "justification": "..." },
          "PUREZA_PRESION": { "score": 10.0, "justification": "..." },
          "category_average": 9.58
        },
        "ECONOMIC": {
          "CAPEX_TOTAL": { "score": 9.0, "justification": "..." },
          "OPEX_GARANTIZADO": { "score": 9.5, "justification": "..." },
          "GARANTIAS_PENALIZACIONES": { "score": 8.5, "justification": "..." },
          "category_average": 9.0
        },
        "EXECUTION": {
          "PLAZO_ENTREGA": { "score": 10.0, "justification": "..." },
          "EXPERIENCIA_TRACK_RECORD": { "score": 9.5, "justification": "..." },
          "SOLIDEZ_PROVEEDOR": { "score": 9.0, "justification": "..." },
          "category_average": 9.5
        },
        "HSE_ESG": {
          "SEGURIDAD_ATEX": { "score": 9.0, "justification": "..." },
          "SOSTENIBILIDAD": { "score": 8.5, "justification": "..." },
          "category_average": 8.75
        }
      },
      "category_scores": {
        "TECHNICAL": { "score": 9.58, "weight": 0.40 },
        "ECONOMIC": { "score": 9.0, "weight": 0.30 },
        "EXECUTION": { "score": 9.5, "weight": 0.20 },
        "HSE_ESG": { "score": 8.75, "weight": 0.10 }
      },
      "strengths": ["Alta eficiencia energetica", "Excelente track record"],
      "weaknesses": ["Plazo de entrega ligeramente mayor"],
      "recommendations": ["Negociar mejora en plazos de entrega"]
    }
  ],
  "statistics": {
    "total_providers": 7,
    "average_score": 7.45,
    "top_performer": "EA",
    "evaluation_date": "2024-01-13T10:30:00Z"
  },
  "message": "Scoring completed for 7 providers"
}
```

---

## 5. Base de Datos

### Tabla `ranking_proveedores`

Almacena los scores calculados por proveedor.

```sql
CREATE TABLE ranking_proveedores (
    provider_name TEXT NOT NULL,
    project_id UUID,
    cumplimiento_porcentual DECIMAL(5,2),
    technical_score DECIMAL(3,1),
    economical_score DECIMAL(3,1),
    pre_feed_score DECIMAL(3,1),
    feed_score DECIMAL(3,1),
    overall_score DECIMAL(3,1),
    evaluation_count INTEGER,
    last_updated TIMESTAMP
);
```

### Vista `ranking_proveedores_por_tipo`

Vista que calcula scores agregados por tipo de evaluacion.

```sql
CREATE VIEW ranking_proveedores_por_tipo AS
WITH provider_scores AS (...)
SELECT
    provider_name,
    project_id,
    technical_score,
    economical_score,
    pre_feed_score,
    feed_score,
    overall_score,
    cumplimiento_porcentual,
    evaluation_count
FROM aggregated_scores
ORDER BY overall_score DESC;
```

---

## 6. Frontend

### Archivos Relacionados

| Archivo | Descripcion |
|---------|-------------|
| `src/stores/useScoringStore.ts` | Store de Zustand para el scoring |
| `src/config/constants.ts` | Endpoint de scoring agregado |
| `src/components/dashboard/tabs/ScoringMatrix.tsx` | Componente actualizado |

### useScoringStore

Estado y acciones para manejar el scoring:

```typescript
interface ScoringState {
    // Estado
    isCalculating: boolean;
    lastCalculation: Date | null;
    scoringResults: ScoringResult | null;
    error: string | null;

    // Acciones
    calculateScoring: (projectId?: string, providerName?: string) => Promise<void>;
    refreshScoring: () => Promise<void>;
    clearError: () => void;
    reset: () => void;
}
```

### ScoringMatrix Component

El componente incluye:

1. **Boton "Recalculate AI Scoring"**: Dispara el calculo via n8n
2. **Indicador de ultimo calculo**: Muestra cuando se calculo por ultima vez
3. **Resumen de resultados**: Top performer, average score, total providers
4. **Estado de carga**: Spinner mientras se calcula
5. **Tabla de scores por requisito**: Permite edicion manual de puntuaciones

---

## 7. Flujo Completo

### Diagrama de Secuencia

```
Usuario       Frontend        n8n             Supabase        Mistral
   |             |             |                  |               |
   |--Click----->|             |                  |               |
   |             |--POST------>|                  |               |
   |             |             |--SELECT--------->|               |
   |             |             |<--requirements---|               |
   |             |             |--SELECT--------->|               |
   |             |             |<--responses------|               |
   |             |             |                  |               |
   |             |             |--Evaluate 12-----|-------------->|
   |             |             |   criteria       |               |
   |             |             |<--Detailed-------|---------------|
   |             |             |   scores         |               |
   |             |             |                  |               |
   |             |             |--UPSERT--------->|               |
   |             |             |<--OK-------------|               |
   |             |<--Response--|                  |               |
   |<--Update----|             |                  |               |
```

### Pasos del Proceso

1. **Usuario accede al Dashboard** -> Se carga `ScoringMatrix`
2. **ScoringMatrix monta** -> Llama a `refreshScoring()` para cargar datos existentes
3. **Usuario hace clic en "Recalculate AI Scoring"** -> Se llama a `calculateScoring()`
4. **Frontend envia POST** al webhook de n8n
5. **n8n obtiene datos** de `rfq_items_master` y `provider_responses`
6. **n8n mapea requisitos** a los 12 criterios de evaluacion
7. **Mistral LLM evalua** cada proveedor segun los 12 criterios
8. **n8n calcula scores ponderados** aplicando los pesos individuales por criterio
9. **n8n guarda en Supabase** tabla `ranking_proveedores`
10. **n8n responde** con el ranking completo incluyendo justificaciones
11. **Frontend actualiza UI** mostrando resultados

---

## 8. Configuracion

### Variables de Entorno

Agregar en `.env`:

```env
VITE_N8N_SCORING_URL=https://n8n.beaienergy.com/webhook/scoring-evaluation
```

### Desplegar Vista en Supabase

Ejecutar el SQL de `bbdd.sql` para crear la vista `ranking_proveedores_por_tipo`:

```sql
-- Ejecutar en Supabase SQL Editor
CREATE OR REPLACE VIEW public.ranking_proveedores_por_tipo AS
...
```

### Importar Workflow en n8n

1. Ir a n8n Dashboard
2. Importar desde archivo: `workflow n8n/scoring.json`
3. Configurar credenciales de Supabase y Mistral
4. Activar el workflow

---

## 9. Uso

### Desde el Dashboard

1. Navegar a **Dashboard > Scoring**
2. Click en **"Recalculate AI Scoring"**
3. Esperar a que termine (puede tomar 30s-2min dependiendo de los proveedores)
4. Ver resultados actualizados en la tabla y graficos

### Via API Directa

```bash
curl -X POST https://n8n.beaienergy.com/webhook-test/scoring-evaluation \
  -H "Content-Type: application/json" \
  -d '{"recalculate_all": true}'
```

### Filtrar por Proveedor

```bash
curl -X POST https://n8n.beaienergy.com/webhook-test/scoring-evaluation \
  -H "Content-Type: application/json" \
  -d '{"provider_name": "TR"}'
```

---

## 10. Troubleshooting

### El scoring no se actualiza

1. Verificar que el workflow esta activo en n8n
2. Verificar credenciales de Supabase en n8n
3. Revisar logs en n8n para errores

### Los graficos no muestran datos

1. Verificar que la vista `ranking_proveedores_por_tipo` existe
2. Verificar politicas RLS en Supabase
3. Revisar consola del navegador para errores

### El LLM no responde

1. Verificar credenciales de Mistral en n8n
2. Verificar que hay respuestas en `provider_responses`
3. Revisar formato del prompt en el nodo LLM

### Scores incorrectos

1. Verificar que los requisitos se mapean correctamente a los criterios
2. Revisar el nodo "Prepare Scoring Data" en n8n
3. Verificar que las respuestas tienen formato reconocido (INCLUIDO, PARCIAL, NO INCLUIDO)

---

## 11. Archivos Relacionados

```
p2x v2/
├── workflow n8n/
│   └── scoring.json                    # Workflow de n8n con 12 criterios
├── bbdd.sql                            # Vista ranking_proveedores_por_tipo
├── front-rfq/
│   └── src/
│       ├── config/
│       │   └── constants.ts            # N8N_SCORING_URL
│       ├── stores/
│       │   └── useScoringStore.ts      # Store de scoring
│       └── components/
│           └── dashboard/
│               └── tabs/
│                   └── ScoringMatrix.tsx  # Componente UI
└── docs/
    └── SCORING_WORKFLOW.md             # Esta documentacion
```

---

## 12. Resumen de Pesos

| Categoria | Criterio | Peso Individual | Peso Categoria |
|-----------|----------|-----------------|----------------|
| **TECNICA** | Eficiencia Sistema (BOP) | 15% | |
| | Degradacion y Vida Util | 10% | |
| | Flexibilidad Operativa | 10% | |
| | Pureza y Presion | 5% | **40%** |
| **ECONOMICA** | CAPEX Total | 15% | |
| | OPEX Garantizado | 10% | |
| | Garantias y Penalizaciones | 5% | **30%** |
| **EJECUCION** | Plazo de Entrega | 10% | |
| | Experiencia (Track Record) | 5% | |
| | Solidez del Proveedor | 5% | **20%** |
| **HSE/ESG** | Seguridad y ATEX | 5% | |
| | Sostenibilidad | 5% | **10%** |
| **TOTAL** | | **100%** | **100%** |

---

**Ultima actualizacion:** 2025-01-13
**Autor:** Claude Code
