# Changelog - Optimizaciones de Workflows n8n

**Fecha:** 2026-01-15
**Objetivo:** Optimizar rendimiento y usar modelos locales para confidencialidad

---

## Resumen de Cambios

| Workflow | Cambios Principales | Impacto Estimado |
|----------|---------------------|------------------|
| ingesta-rfqs.json | numCtx reducido, chunks optimizados | -60% tiempo |
| ingesta-ofertas.json | Clasificador/validador bypassed, batch reducido | -55% tiempo |
| chat.json | Modelo cambiado a qwen3:8b | -50% RAM |
| scoring.json | OpenRouter -> Ollama local, prompt compacto | 100% local |
| q&a.json | deepseek-r1 -> qwen3:8b | -50% tiempo |
| mail.json | deepseek-r1 -> qwen3:8b | -50% tiempo |

---

## 1. ingesta-rfqs.json

### Cambios en Modelos

| Nodo | Antes | Despues |
|------|-------|---------|
| Ollama Extractor2 | `mistral:7b`, numCtx: 32768 | `qwen3:8b`, numCtx: 8192, numPredict: 2048 |
| Ollama Extractor1 | `qwen3:8b`, sin limites | `qwen3:8b`, numCtx: 8192, numPredict: 2048 |

### Cambios en Chunking

```javascript
// ANTES
const chunkSize = 15000;
const overlap = 1500;

// DESPUES
const chunkSize = 6000;
const overlap = 400;
```

**Razon:** Chunks mas pequenos = respuestas LLM mas rapidas y menos saturacion de RAM.

---

## 2. ingesta-ofertas.json

### Cambios en Modelos

| Nodo | Antes | Despues |
|------|-------|---------|
| Ollama Model1 (Evaluador) | `qwen3:14b`, sin limites | `qwen3:8b`, numCtx: 8192, numPredict: 1536 |
| Ollama Model (Clasificador) | `mistral:7b`, sin limites | `mistral:7b`, numCtx: 4096, numPredict: 1024 |
| Ollama Chat Model1 (Validador) | `mistral:7b`, sin limites | `mistral:7b`, numCtx: 4096, numPredict: 1024 |

### Cambios en Batch Size

```javascript
// ANTES
const BATCH_SIZE = 12;

// DESPUES
const BATCH_SIZE = 5;
```

### Bypass de Clasificador/Validador

**Nodos modificados:**
- `Expandir por Tipo de Evaluacion` - Ahora usa directamente datos del usuario
- `Format for Vectorstore` - Ya no intenta leer del LLM

**Cambio en conexiones:**
```
ANTES:
If -> TRUE -> Validador de Ofertas -> Format for Vectorstore
If -> FALSE -> Clasificador -> Format for Vectorstore

DESPUES:
If -> TRUE -> Format for Vectorstore (directo)
If -> FALSE -> Format for Vectorstore (directo)
```

**Razon:** El usuario ya proporciona proveedor, proyecto y tipo de evaluacion. No es necesario clasificar/validar con LLM, ahorra 10-20 segundos por documento.

---

## 3. chat.json

### Cambios en Modelo

| Parametro | Antes | Despues |
|-----------|-------|---------|
| model | `ministral-3:8b` | `qwen3:8b` |
| numCtx | 16384 | 8192 |
| numPredict | 512 | 1024 |

**Razon:** qwen3:8b maneja mejor espanol y JSON estructurado.

---

## 4. scoring.json

### Cambio Critico: Cloud -> Local

| Parametro | Antes | Despues |
|-----------|-------|---------|
| Tipo de nodo | `lmChatOpenRouter` (CLOUD) | `lmChatOllama` (LOCAL) |
| model | OpenRouter API | `qwen3:8b` |
| numCtx | - | 8192 |
| numPredict | - | 2048 |

### Optimizacion del Prompt

**ANTES:** Enviaba ~30k-50k tokens con todos los datos crudos de requisitos
```javascript
// Cada item tenia:
{
    requirement_id, requirement_text, criterion_id, criterion_name,
    criterion_weight, what_to_evaluate, evaluation_value, comment, existing_score
}
```

**DESPUES:** Envia ~500 tokens con resumen estadistico
```javascript
// Solo resumen por categoria:
{
    TECHNICAL: { total: 25, included: 18, partial: 5, not_included: 2, avg_score: 7.5 },
    ECONOMIC: { total: 15, included: 10, partial: 3, not_included: 2, avg_score: 6.8 },
    // ...
}
```

**Prompt reducido de ~2500 tokens a ~400 tokens**

---

## 5. q&a.json

### Cambios en Modelo

| Parametro | Antes | Despues |
|-----------|-------|---------|
| model | `deepseek-r1:14b` | `qwen3:8b` |
| numCtx | - | 8192 |
| numPredict | - | 1536 |

**Razon:** deepseek-r1 es muy lento para tareas simples de generacion de preguntas.

---

## 6. mail.json

### Cambios en Modelo

| Parametro | Antes | Despues |
|-----------|-------|---------|
| model | `deepseek-r1:14b` | `qwen3:8b` |
| numCtx | - | 4096 |
| numPredict | - | 1024 |

---

## Tiempos Estimados

| Workflow | Antes | Despues | Mejora |
|----------|-------|---------|--------|
| Ingesta RFQ (100 pags) | 15-20 min | 5-8 min | ~60% |
| Ingesta Oferta (80 req) | 10-15 min | 4-6 min | ~55% |
| Chat respuesta | 5-10 seg | 2-4 seg | ~60% |
| Scoring (5 proveedores) | Dependia de API | 3-5 min | 100% local |
| Q&A generation | 30-60 seg | 10-20 seg | ~65% |

---

## Modelos Locales Utilizados

Todos los workflows ahora usan exclusivamente estos modelos locales:

| Modelo | Uso Principal | RAM Estimada |
|--------|---------------|--------------|
| `qwen3:8b` | Chat, Scoring, Q&A, Mail, Extraccion | 8GB |
| `mistral:7b` | Clasificacion rapida | 6GB |
| `qwen3-embedding:8b` | Embeddings vectorstore | 2GB |

---

## Configuracion Recomendada de Ollama

```bash
# Variables de entorno para evitar saturacion
export OLLAMA_NUM_PARALLEL=1      # Solo 1 request a la vez
export OLLAMA_MAX_LOADED_MODELS=2 # Maximo 2 modelos en RAM simultaneamente
```

---

## Proximos Pasos

1. **Reimportar workflows** en n8n desde los archivos JSON actualizados
2. **Probar con documento pequeno** antes de procesar lotes grandes
3. **Monitorear RAM** durante ejecucion: `watch -n 1 'ollama ps'`
4. **Ajustar BATCH_SIZE** si hay errores de timeout (reducir a 3-4)

---

## Notas de Seguridad

- Todos los datos ahora se procesan localmente
- No hay llamadas a APIs externas (OpenRouter eliminado)
- Los modelos locales no envian datos fuera del servidor
