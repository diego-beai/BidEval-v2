# Informe de Arquitectura IA/RAG - BidEval v2

**Fecha:** 2026-02-10 (actualizado)
**Objetivo:** Analisis de la arquitectura actual de IA, correspondencia con los PDFs demo, y recomendaciones para la demo con Mariano y evolucion a produccion.

---

## 1. Arquitectura Actual

### 1.1 Stack Tecnologico

| Componente | Tecnologia | Rol |
|------------|-----------|-----|
| **Frontend** | React + Zustand + Recharts | UI, estado, visualizaciones |
| **Orquestador Backend** | n8n (webhooks) | Workflows de procesamiento, scoring, Q&A, chat, email |
| **Base de Datos** | Supabase (PostgreSQL + pgvector) | Datos estructurados + vector store |
| **LLM (Scoring/Extraccion)** | Mistral Large (via n8n) | Evaluacion criterios 0-10, extraccion datos economicos |
| **Embeddings** | Qwen3 (4096 dimensiones) | Vectorizacion de documentos para RAG |
| **OCR** | Docling / Extract from File (n8n) | Extraccion de texto de PDFs |

### 1.2 Flujo de Datos Completo

```
PDF Upload (base64) --> n8n webhook --> OCR --> Vectorizacion (Qwen3 4096d)
                                                     |
                                                     v
                                              pgvector (Supabase)
                                                     |
                                         +-----+-----+-----+-----+
                                         |     |     |     |     |
                                         v     v     v     v     v
                                       RAG   Scoring  Q&A  Chat  Econ.
                                      (eval) (Mistral)(IA) (RAG) Extract
                                         |     |     |     |     |
                                         v     v     v     v     v
                                        Supabase (resultados)
                                                     |
                                                     v
                                               React Dashboard
```

### 1.3 Endpoints n8n Identificados

| Endpoint | Funcion | Timeout |
|----------|---------|---------|
| `/api/n8n/ingesta-rfq` | Ingesta de RFQ base del cliente | 30 min |
| `/api/n8n/ofertas` | Evaluacion de propuestas + extraccion economica | 30 min |
| `/api/n8n/scoring-evaluation` | Calculo de scoring multicriteria | 30 min |
| `/api/n8n/qa-audit-generator` | Generacion automatica de preguntas Q&A | 30 min |
| `/api/n8n/qa-send-to-supplier` | Envio de Q&A a proveedores | 30 seg |
| `/api/n8n/qa-send-email` | Envio de email con preguntas | 60 seg |
| `/api/n8n/qa-process-responses` | Procesamiento de respuestas con IA | 2 min |
| `/api/n8n/chat-rfq` | Chat conversacional RAG | 30 min |
| `/api/n8n/rfp-generate` | Generacion de documento RFP con IA | 30 min |

---

## 2. PDFs Demo: Estructura y Capacidad de Extraccion IA

### 2.1 Inventario de PDFs Demo (19 documentos)

| Categoria | Documentos | Paginas Total | Contenido Clave para IA |
|-----------|-----------|---------------|------------------------|
| **RFPs (3)** | Tecnica, Economica, Compliance | 32 pags | Requisitos, criterios evaluacion, condiciones |
| **Ofertas Tecnicas (4)** | 1 por proveedor | 56 pags | Metodologia, equipo, cronograma, entregables, riesgos |
| **Ofertas Economicas (4)** | 1 por proveedor | 48 pags | CAPEX/OPEX, rate card, sensibilidad, condiciones |
| **Ofertas Compliance (4)** | 1 por proveedor | 32 pags | HSE, indicadores, formacion, certificaciones |
| **Anexos (4)** | 1 por proveedor | 38 pags | Certificaciones, CVs, organigrama, seguros |
| **TOTAL** | **19 PDFs** | **~206 pags** | - |

### 2.2 Estructura por Proveedor (4 perfiles diferenciados)

| Proveedor | Perfil | Fortaleza | Debilidad | CAPEX |
|-----------|--------|-----------|-----------|-------|
| TechnoEngineering S.L. | Lider tecnico senior | Excelencia tecnica, equipo PhD | Precio medio-alto | 14.5M EUR |
| Iberia Industrial S.A. | Equilibrada nacional | Calidad-precio, flexibilidad | Menos experiencia intl. | 13.0M EUR |
| Global Process Eng. Ltd | Internacional low-cost | Precio agresivo, recursos globales | Compliance debil, exclusiones | 11.35M EUR |
| MediterraneanEPC S.L. | Premium HSE/sostenibilidad | TRIR 0.18, garantia 24 meses | Precio mas alto | 15.7M EUR |

Esta diferenciacion es ideal para la demo porque muestra 4 arquetipos claros de proveedores que generan un spider chart con perfiles visualmente distintos.

### 2.3 Contenido Optimizado para Extraccion LLM

Los PDFs contienen datos estructurados en tablas, lo que facilita la extraccion automatica por Mistral Large:

**Ofertas Tecnicas (14 paginas, 11 secciones):**
- Tabla de referencias (proyecto, cliente, ano, capacidad, estado)
- Tabla de cronograma (fase, periodo, entregables clave)
- Tabla de equipo de proyecto (nombre, rol, experiencia, titulacion, dedicacion)
- Tabla de software/herramientas (disciplina, software, licencia)
- Tabla de auditorias QA/QC (tipo, frecuencia, responsable)
- Tabla de riesgos (ID, riesgo, probabilidad, impacto, mitigacion)
- Tabla de reuniones (tipo, frecuencia, participantes, objetivo)
- Lista detallada de entregables por disciplina (codigo, entregable, formato)

**Ofertas Economicas (12 paginas, 7 secciones):**
- Tabla CAPEX resumen (partida, importe, % total)
- Tabla detalle ingenieria (concepto, importe, horas estimadas)
- Tabla detalle procura (concepto, importe, observaciones)
- Tabla detalle construccion (concepto, importe, observaciones)
- Tabla detalle commissioning (concepto, importe, observaciones)
- Tabla OPEX resumen (partida, importe anual, % total)
- Tabla rate card (perfil, experiencia, EUR/h, dedicacion)
- Tabla sensibilidad (escenario, variacion, CAPEX estimado, delta)
- Tabla hitos de pago (hito, % pago, momento)
- Tabla resumen general (concepto, importe)

**Ofertas Compliance (8 paginas, 8 secciones):**
- Tabla indicadores HSE (indicador, 2022, 2023, 2024)
- Tabla formacion HSE (modulo, destinatarios, duracion, periodicidad)
- Lista de certificaciones con detalles
- Lista de procedimientos de emergencia

**Reto de extraccion:** Las tablas estan generadas con fpdf2 usando celdas con bordes, que se extraen bien como texto plano. Las keywords estan en espanol e ingles para maximizar la deteccion.

---

## 3. Limitaciones con Documentos Largos

### 3.1 Estimacion de Tokens por Tipo de PDF Demo

| Tipo PDF | Paginas | Tokens Estimados | Riesgo con Mistral Large (128K) |
|----------|---------|-----------------|-------------------------------|
| Oferta Tecnica | 14 | ~8.000-10.000 | OK |
| Oferta Economica | 12 | ~7.000-9.000 | OK |
| Oferta Compliance | 8 | ~4.000-6.000 | OK |
| Anexos | 9-10 | ~5.000-7.000 | OK |
| RFP Tecnica | 12 | ~7.000-9.000 | OK |
| **Todas las ofertas de 1 proveedor** | **43-44** | **~25.000-32.000** | **OK pero denso** |
| **Scoring 4 proveedores** | **all** | **~100.000-130.000** | **RIESGO: cerca del limite** |

Los PDFs demo estan dentro de los limites de Mistral Large para procesamiento individual. El riesgo aparece al hacer scoring simultaneo de los 4 proveedores, donde el contexto podria aproximarse al limite de 128K tokens.

### 3.2 Estrategia Recomendada

Para la demo, el procesamiento secuencial (1 proveedor a la vez) es seguro. Para produccion con documentos reales de 50-100 paginas, implementar:

1. **Chunking jerarquico** por secciones del documento
2. **Map-Reduce** para scoring (evaluar por chunk, agregar scores)
3. **Filtrado pre-vectorial** por tipo de evaluacion y disciplina

---

## 4. Validacion RFP <-> Oferta <-> Requisitos

### 4.1 Correspondencia de Contenido

Los PDFs demo estan disenados para que cada oferta responda directamente a los requisitos de la RFP correspondiente:

| Requisito RFP Tecnica | Donde Responde la Oferta Tecnica |
|----------------------|--------------------------------|
| Sec 1: Objeto del proyecto | Sec 1: Presentacion + Sec 2: Metodologia |
| Sec 2: Alcance de trabajos | Sec 3: Propuesta por unidad de proceso |
| Sec 4: Ingenieria de proceso | Sec 3.1-3.3: Detalle tecnico por unidad |
| Sec 7: Plan de ejecucion | Sec 2.1: Cronograma + Sec 8: Comunicaciones |
| Sec 8: Personal y organizacion | Sec 4: Equipo proyecto (tabla con nombres) |
| Sec 9: Gestion de calidad | Sec 6: Plan QA/QC (procedimientos, auditorias) |
| Sec 10: Documentacion entregable | Sec 9: Lista detallada de entregables por disciplina |
| Sec 11: Criterios evaluacion | Sec 7: Gestion de riesgos + Sec 11: Excepciones |

| Requisito RFP Economica | Donde Responde la Oferta Economica |
|-------------------------|----------------------------------|
| Sec 2: Estructura CAPEX | Sec 2: Desglose CAPEX (4 partidas + detalle) |
| Sec 3: Estructura OPEX | Sec 3: Estimacion OPEX (4 partidas) |
| Sec 4: Formato tablas | Sec 2-3: Tablas formateadas A/B |
| Sec 5: Condiciones pago | Sec 7: Condiciones diferenciadas por proveedor |
| Sec 6: Modelo contractual | Sec 7.3: Calendario hitos + Sec 7.6: Garantias |
| Sec 7: Criterios evaluacion | Sec 4: Rate card + Sec 5: Analisis sensibilidad |

### 4.2 Diferenciacion para Scoring

Los PDFs estan disenados para que cada proveedor tenga fortalezas y debilidades claras que generen diferencias en el scoring:

| Criterio Scoring | Mejor Proveedor | Peor Proveedor | Diferencia Esperada |
|-----------------|----------------|----------------|-------------------|
| scope_facilities | TechnoEng (detalle Digital Twin) | Global (modelo basico) | ~2 puntos |
| total_price | Global (11.35M) | Mediterranean (15.7M) | ~3 puntos |
| schedule | Global (9 meses) | Mediterranean (12 meses) | ~1.5 puntos |
| resources | TechnoEng (7 seniors, PhD) | Global (5 personas, 80% PM) | ~2 puntos |
| exceptions | Mediterranean (0 excepciones + extras) | Global (5+ excepciones) | ~3 puntos |
| safety | Mediterranean (TRIR 0.18) | Global (TRIR 0.68) | ~3 puntos |
| regulatory | Mediterranean (7 certificaciones) | Global (2 certificaciones) | ~3 puntos |

---

## 5. Recomendaciones para la Demo

### 5.1 Preparacion Pre-Demo

1. **Crear proyecto** con el wizard: "Planta Procesamiento Gas Natural - Fase FEED"
2. **Configurar proveedores:** TechnoEngineering, Iberia Industrial, Global Process, MediterraneanEPC
3. **Configurar matriz** con pesos: Technical 30%, Economic 35%, Execution 20%, HSE 15%
4. **Pre-procesar** al menos 2 proveedores completos (tecnica + economica) como fallback
5. **Verificar** que los scores sean coherentes (Global = mejor precio, Mediterranean = mejor HSE)

### 5.2 Narrativa de Demo

```
1. Crear proyecto "FEED GNL" (Setup Wizard con calendario y proveedores)
2. Subir RFP Tecnica + Economica (drag & drop, mostrar progreso)
3. Subir 2-3 ofertas tecnicas y economicas de proveedores
4. Dashboard Ejecutivo: Spider chart, tabla ranking
5. Seccion Economica: Comparacion CAPEX/OPEX, condiciones diferenciadas
6. Q&A: Preguntas generadas por IA sobre debilidades de Global Process (compliance)
7. Chat RAG: "Compare las condiciones de pago de todos los proveedores"
```

### 5.3 Puntos Fuertes a Destacar

- **Extraccion automatica:** "BidEval lee los PDFs y extrae tablas CAPEX/OPEX automaticamente"
- **Transparencia:** "Los pesos se definen al principio, como exige la LCSP"
- **Comparacion visual:** Spider chart con 4 proveedores con perfiles distintos
- **Rate card:** "Podemos ver las tarifas por hora de cada proveedor"
- **Condiciones diferenciadas:** "Cada proveedor tiene condiciones de pago y garantias distintas"

---

## 6. De Demo a Produccion

| Aspecto | Demo (actual) | Produccion |
|---------|--------------|------------|
| **Documentos** | 19 PDFs demo (12-14 pags) | PDFs reales (50-100+ pags) |
| **Modelos** | Mistral API + Qwen3 local | On-premise con GPU dedicada |
| **Embeddings** | 4096d sin indice HNSW | 1024d con indice HNSW |
| **Procesamiento** | Sincronico (30 min timeout) | Cola asincrona |
| **Progreso** | Simulado (timer 2 min) | Real (Supabase Realtime) |
| **Scoring economico** | Cualitativo IA (0-10) | Hibrido cuantitativo + cualitativo |
| **Auth** | Sin autenticacion | Supabase Auth + RLS |
| **Multi-tenant** | project_id manual | Organizacion + proyecto |

### 6.1 Mejoras Prioritarias Post-Demo

**P1 - Core:**
1. Scoring cuantitativo para precio (formula inversa)
2. Procesamiento asincrono con progreso real
3. Tipo "Compliance/HSE" en el clasificador
4. Integrar `economic_offers` con scoring

**P2 - Produccion:**
5. Migrar embeddings a 1024d + indice HNSW
6. Chunking semantico con metadata de disciplina
7. Autenticacion y multi-tenancy
8. Parser especializado para tablas PDF

---

## 7. Riesgos y Mitigaciones para Demo

| Riesgo | Probabilidad | Impacto | Mitigacion |
|--------|-------------|---------|------------|
| n8n timeout durante demo | Media | Alto | **Pre-procesar datos, tener proyecto fallback** |
| Scoring inconsistente con precios | Alta | Alto | **Calibrar scores manualmente pre-demo** |
| Compliance sin tipo adecuado | Alta | Medio | **Subir como "Technical", IA detecta HSE** |
| Tablas economicas mal extraidas | Baja | Medio | **PDFs tienen tablas limpias con headers** |
| Preguntas de Mariano sobre formulas | Media | Medio | **Preparar explicacion de scoring hibrido** |

---

*Informe actualizado el 2026-02-10. Basado en analisis de codigo fuente, workflow n8n, y 19 PDFs demo regenerados (206 paginas totales, 211 KB).*
