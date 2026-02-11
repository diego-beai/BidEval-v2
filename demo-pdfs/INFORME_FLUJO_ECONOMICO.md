# Informe: Flujo Completo de la Seccion Economica - BidEval v2

**Fecha:** 2026-02-10 (actualizado)
**Objetivo:** Documentar el flujo end-to-end desde la subida de un PDF economico hasta la visualizacion de datos en el frontend, incluyendo la correspondencia con los PDFs demo generados.

---

## 1. Diagrama de Flujo Completo

```
USUARIO                    FRONTEND (React)                n8n WORKFLOW                    SUPABASE
  |                            |                               |                              |
  |  1. Sube PDF oferta        |                               |                              |
  |  + selecciona metadata     |                               |                              |
  |--------------------------->|                               |                              |
  |                            |                               |                              |
  |    2. MultiFileMetadataModal                               |                              |
  |    - Proyecto: "FEED GNL"  |                               |                              |
  |    - Proveedor: "TechnoEng"|                               |                              |
  |    - Tipo: ["Economical    |                               |                              |
  |      Evaluation"]          |                               |                              |
  |                            |                               |                              |
  |                            |  3. POST /api/n8n/ofertas     |                              |
  |                            |  (base64 PDF + metadata)      |                              |
  |                            |------------------------------>|                              |
  |                            |                               |                              |
  |                            |                   4. Webhook recibe payload                   |
  |                            |                      Code in JavaScript1                      |
  |                            |                      Set File ID                              |
  |                            |                               |                              |
  |                            |                   5. OCR: Docling / Extract from File         |
  |                            |                      (PDF -> texto plano)                     |
  |                            |                               |                              |
  |                            |                   6. Merge1 (combina texto completo)          |
  |                            |                      |                                        |
  |                            |                      |--- RAMA A: Evaluacion tecnica          |
  |                            |                      |    (Loop Over Phases -> LLM ->         |
  |                            |                      |     provider_responses)                 |
  |                            |                      |                                        |
  |                            |                      |--- RAMA B: EXTRACCION ECONOMICA        |
  |                            |                           |                                    |
  |                            |                  7. Check If Economic Offer                    |
  |                            |                     (verifica si hay contenido economico)      |
  |                            |                           |                                    |
  |                            |                  8. Extract Economic Data                      |
  |                            |                     (LLM: Mistral Large, temp=0.1)             |
  |                            |                           |                                    |
  |                            |                  9. Parse Economic JSON                        |
  |                            |                     (valida/limpia output del LLM)             |
  |                            |                           |                                    |
  |                            |                 10. Save Economic Offer  ------------------>   |
  |                            |                     (UPSERT en economic_offers)                |
  |                            |                     ON CONFLICT(project_id, provider_name)     |
  |                            |                               |                              |
  |  ========================= VISUALIZACION ==================================               |
  |                            |                               |                              |
  |                            |  11. useEconomicStore.loadOffers()                            |
  |                            |  SELECT * FROM economic_offers  --------------------->        |
  |                            |  WHERE project_id = activeProjectId                           |
  |                            |  ORDER BY total_price ASC                                     |
  |                            |                               |           <------- datos      |
  |                            |                               |                              |
  |                            |  12. Calcula comparison:      |                              |
  |                            |  net_price = total*(1-dto/100)|                              |
  |                            |  Ordena por net_price         |                              |
  |                            |  Asigna price_rank            |                              |
  |                            |                               |                              |
  |  13. EconomicSection.tsx   |                               |                              |
  |  renderiza:                |                               |                              |
  |  - Summary cards           |                               |                              |
  |  - Tabla comparativa       |                               |                              |
  |  - Detalles expandibles    |                               |                              |
  |<---------------------------|                               |                              |
```

---

## 2. Que es n8n y Que es Supabase en el Flujo

### 2.1 n8n (Procesamiento / Orquestacion)

n8n actua como el **cerebro de procesamiento**:

| Nodo n8n | Funcion |
|-----------|---------|
| `Webhook` | Recibe el PDF en base64 desde el frontend |
| `Code in JavaScript1` | Parsea el payload (file_binary, metadata) |
| `Docling OCR` / `Extract from File` | Convierte PDF a texto plano |
| `Merge1` | Combina texto - punto de bifurcacion |
| **`Check If Economic Offer`** | Determina si el doc tiene contenido economico |
| **`Extract Economic Data`** | LLM (Mistral Large, temp=0.1) extrae datos estructurados |
| **`Parse Economic JSON`** | Valida y limpia el JSON del LLM |
| **`Save Economic Offer`** | UPSERT en tabla `economic_offers` |

### 2.2 Supabase (Almacenamiento / Lectura directa)

| Tabla Supabase | Quien la escribe | Quien la lee |
|----------------|-----------------|--------------|
| `economic_offers` | n8n (Save Economic Offer) | Frontend (useEconomicStore) |
| `ranking_proveedores` | n8n (Scoring workflow) | Frontend (useScoringStore, ExecutiveView) |
| `v_economic_comparison` | Vista SQL automatica | No usada actualmente en frontend |

**Patron clave:** n8n ESCRIBE, Supabase ALMACENA, Frontend LEE DIRECTO de Supabase.

---

## 3. Que Datos Contienen los PDFs Demo para Extraccion

### 3.1 Estructura de cada Oferta Economica (12 paginas, 7 secciones)

Cada PDF de oferta economica contiene:

| Seccion PDF | Campos extraibles | Tabla DB destino |
|-------------|------------------|-----------------|
| S1. Resumen Ejecutivo | `total_price`, `currency`, LCC | `economic_offers` |
| S2. Desglose CAPEX | `price_breakdown` (4 partidas + subdesglose) | `economic_offers.price_breakdown` |
| S3. Estimacion OPEX | OPEX desglosado en 4 partidas | `economic_offers.tco_breakdown` |
| S4. Rate Card | Tarifas por perfil (EUR/h) | No tiene campo directo* |
| S5. Analisis Sensibilidad | Escenarios +/- 10%, +/- 20% | No tiene campo directo* |
| S6. Resumen General | Tabla consolidada CAPEX + OPEX + LCC | `economic_offers` (confirmacion) |
| S7. Condiciones Comerciales | Validez, pagos, descuentos, exclusiones, garantias | Multiples campos |

*Nota: Los campos Rate Card y Sensibilidad no tienen columna dedicada en `economic_offers`. Se recomienda almacenar en `optional_items` o `alternative_offers` como JSON.

### 3.2 Mapeo Exacto PDF -> Campo DB

```json
{
  "total_price": "Seccion 2, fila 'SUBTOTAL CAPEX'",
  "currency": "EUR (siempre)",
  "price_breakdown": {
    "ingenieria": "Seccion 2, Detalle A.1",
    "procura": "Seccion 2, Detalle A.2",
    "construccion": "Seccion 2, Detalle A.3",
    "commissioning": "Seccion 2, Detalle A.4"
  },
  "discount_percentage": "Seccion 7.4 'Descuentos'",
  "discount_conditions": "Seccion 7.4 texto",
  "tco_value": "Seccion 6, fila 'LCC'",
  "tco_period_years": 10,
  "tco_breakdown": {
    "capex": "Seccion 6, fila 'Total CAPEX'",
    "opex_annual": "Seccion 3, fila 'SUBTOTAL OPEX'"
  },
  "payment_terms": "Seccion 7.2 texto",
  "payment_schedule": "Seccion 7.3 tabla de hitos",
  "validity_days": "Seccion 7.1 texto",
  "price_escalation": "Seccion 7.4 texto (si revisable)",
  "guarantees": "Seccion 7.6 texto",
  "insurance_included": "Anexos, Anexo IV polizas"
}
```

### 3.3 Ejemplo de Extraccion Esperada (TechnoEngineering)

```json
{
  "total_price": 14500000,
  "currency": "EUR",
  "price_breakdown": {
    "ingenieria": 3200000,
    "procura": 4100000,
    "construccion": 5800000,
    "commissioning": 1400000
  },
  "discount_percentage": 2,
  "discount_conditions": "Pronto pago dentro de 15 dias",
  "tco_value": 25900000,
  "tco_period_years": 10,
  "tco_breakdown": {
    "capex": 14500000,
    "opex_annual": 1140000
  },
  "payment_terms": "15/20/30/20/10/5",
  "payment_schedule": [
    {"milestone": "Anticipo (contra aval)", "percent": 15, "event": "Firma del contrato"},
    {"milestone": "Aprobacion PFDs", "percent": 20, "event": "Mes 3"},
    {"milestone": "IFC", "percent": 30, "event": "Mes 9"},
    {"milestone": "Certificaciones construccion", "percent": 20, "event": "Meses 9-11"},
    {"milestone": "Mechanical Completion", "percent": 10, "event": "Mes 11"},
    {"milestone": "Performance Test", "percent": 5, "event": "Mes 12+"}
  ],
  "validity_days": 90,
  "price_escalation": null,
  "guarantees": "Aval 10% (Santander), RC Profesional 10M EUR, Garantia ingenieria 18 meses",
  "insurance_included": true,
  "extraction_confidence": 0.95
}
```

---

## 4. Deteccion de Contenido Economico

El nodo `Check If Economic Offer` usa DOS metodos:

**Metodo A: Por tipo de evaluacion (etiqueta del usuario)**
```javascript
const hasEconomic = evaluationTypes.some(t =>
    t.toLowerCase().includes('econom') ||
    t.toLowerCase().includes('commercial') ||
    t.toLowerCase().includes('pricing')
);
```

**Metodo B: Por keywords en el texto (fallback)**

Los PDFs demo contienen abundantes keywords que dispararian la deteccion automatica:
- "CAPEX", "OPEX", "precio total", "desglose", "EUR/h"
- "oferta economica", "condiciones de pago", "descuento"
- "analisis de sensibilidad", "rate card", "tarifas"

---

## 5. Boton "Cargar datos demo" (flujo alternativo)

`EconomicSection.tsx` tiene un boton que:
1. Genera 5 ofertas hardcodeadas (Siemens, ABB, Schneider, Eaton, GE Vernova)
2. UPSERT directo en `economic_offers` desde frontend via Supabase client
3. **Bypasa completamente n8n**

**ACCION NECESARIA:** Los proveedores del boton demo (Siemens, ABB...) no coinciden con los PDFs demo (TechnoEng, Iberia...). Opciones:
- A) Actualizar el boton demo con los datos de los 4 proveedores de los PDFs
- B) Crear un seed SQL separado para la demo
- C) Procesar los PDFs por n8n y dejar que la extraccion automatica cargue los datos

---

## 6. GAPS Identificados para la Demo

### 6.1 GAP CRITICO: Desconexion scoring <-> datos economicos

**Sigue vigente.** `economic_offers` tiene precios reales (11.35M - 15.7M) pero `ranking_proveedores` tiene scores cualitativos IA (0-10) que NO se calculan a partir de esos precios.

**Riesgo demo:** Si Mariano ve que Global Process es el mas barato (11.35M) pero su score economico no es el mas alto, no tendra sentido.

### 6.2 GAP: No hay feedback loop entre extraccion y scoring

```
PDF -> n8n -> economic_offers (precios reales: 11.35M - 15.7M)
PDF -> n8n -> provider_responses -> scoring -> ranking_proveedores (scores IA 0-10)
```

Estos flujos son paralelos e independientes. El scoring NO consulta los datos cuantitativos.

### 6.3 GAP: Datos demo del boton son otros proveedores

- Boton demo: Siemens, ABB, Schneider, Eaton, GE Vernova
- PDFs demo: TechnoEngineering, Iberia Industrial, Global Process, MediterraneanEPC

### 6.4 RESUELTO: Rate Card y Sensibilidad no tienen campo DB

Los PDFs ahora incluyen Rate Card (S4) y Analisis de Sensibilidad (S5), pero `economic_offers` no tiene columnas para estos datos. Se pueden almacenar en `optional_items` como JSON.

---

## 7. Archivos Clave

| Archivo | Rol |
|---------|-----|
| `components/economic/EconomicSection.tsx` | UI principal seccion economica |
| `stores/useEconomicStore.ts` | Store Zustand, lectura de Supabase |
| `services/n8n.service.ts` | Upload a webhooks n8n |
| `config/constants.ts` | URLs de endpoints |
| `components/upload/MultiFileMetadataModal.tsx` | Modal metadata con tipo evaluacion |
| `workflow n8n/Workflow-completo.json` | Workflow n8n (nodos economicos) |
| `migrations/002_economic_section.sql` | Tabla economic_offers + vista + RLS |
| `stores/useScoringStore.ts` | Store scoring (ranking_proveedores) |
| `components/dashboard/tabs/ExecutiveView.tsx` | Vista ejecutiva con charts |
| **`demo-pdfs/generate_demo_pdfs.py`** | **Script generador de PDFs demo** |

---

## 8. Recomendaciones para Demo con Mariano

1. **Usar datos demo consistentes:** Actualizar boton demo o seed SQL con los 4 proveedores de los PDFs
2. **Pre-cargar datos economicos:** Procesar los PDFs por n8n antes de la demo o usar seed SQL
3. **Calibrar scores:** Asegurar que el score economico de Global Process (mas barato) sea el mas alto
4. **Narrativa:** "BidEval extrae automaticamente datos CAPEX/OPEX de los PDFs, compara condiciones comerciales y calcula rankings"
5. **Punto fuerte:** Mostrar las condiciones diferenciadas (anticipo, garantias, descuentos) y como el sistema permite compararlas
6. **Evitar mostrar:** La desconexion entre datos cuantitativos y scores cualitativos
